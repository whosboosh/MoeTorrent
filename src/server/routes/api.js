const { Router } = require('express')
const WebTorrent = require('webtorrent')
const fs = require('fs')
require('events').EventEmitter.prototype._maxListeners = 500

const torrentFile = 'public/torrents.json'

const connectedUsers = []

const api = (expressWs) => {
  const router = Router()

  const client = new WebTorrent()

  client.on('error', (error) => {
    let err = error.toString()
    for (const user of connectedUsers) {
      if (user.readyState === 1) {
        user.send(JSON.stringify({ status: 'error', err }))
      }
    }
  })

  // Add torrents to start downloading from previous opening
  openTorrents()
    .then(torrents => {
      for (const prop in torrents) {
        let opts = {
          path: torrents[prop].path
        }
        new Promise((resolve) => {
          client.add(torrents[prop].infoHash, opts, (parsedTorrent) => {
            parsedTorrent.on('error', (err) => {
              reject(err, parsedTorrent)
            })
            resolve(parsedTorrent)
          })
        })
          .then((torrent) => subscribeTorrents(client, torrent))
          .catch((err, parsedTorrent) => { 
              for (const user of connectedUsers) {
                if (user.readyState === 1) {
                  user.send(JSON.stringify({ status: 'error', err }))
                }
              }
              parsedTorrent.removeListener('error', () => {
                console.log('Removed error listener for ' + parsedTorrent.infoHash)
              }) 
              console.log(err)
           })
      }
    })
    .catch(e => console.log(e))

  router.ws('/', (ws, req, next) => {
    const aWss = expressWs.getWss('/a')

    aWss.clients.forEach(user => {
      user.id = generateID()
      if (connectedUsers.map(e => { return e.id }).indexOf(user.id) === -1) {
        connectedUsers.push(user)
      }
      for (const torrent of client.torrents) {
        if (user.readyState === 1) {
          user.send(JSON.stringify({ status: 'update', data: destructureTorrent(torrent) }))
        }
      }
    })

    ws.on('message', (message) => {
      const parsed = JSON.parse(message)
      if (typeof parsed.data === 'undefined') {
        return next('No torrent provided')
      } else if (parsed.status === 'addTorrent') {
        // Add torrent to client
        let opts = {}
        if (typeof parsed.title !== 'undefined' && typeof parsed.location !== 'undefined') {
          opts = {
            path: `${parsed.location}\\${stringToSlug(parsed.title)}`
          }
        }
        client.add(parsed.data, opts, (torrent) => {
          console.log('Adding torrent: ' + torrent.infoHash)

          writeTorrent(destructureTorrent(torrent))
            .then(() => console.log('Wrote torrent to disk'))

          torrent.on('download', (bytes) => {
            sendDownloadInformation(torrent)
          })

          torrent.on('done', () => {
            writeTorrent(destructureTorrent(torrent))
              .then(() => completeTorrent(torrent))  
          })

          for (const user of connectedUsers) {
            if (user.readyState === 1) {
              user.send(JSON.stringify({ status: 'update', data: destructureTorrent(torrent) }))
            }
          }
        })
      } else if (parsed.status === 'removeTorrent') {
        const torrent = client.get(parsed.data.infoHash)

        if (torrent != null) {
          removeTorrent(torrent)
            .catch(e => { return next(e) })          
          for (let p in torrent._peers) {
            if (torrent._peers[p].wire != null) {
              torrent.wires.push(torrent._peers[p].wire)
            }
          }
          torrent.resume()

          client.remove(torrent, (err) => {
            if (err) return next(err)
          })

          let simpleTorrent = {
            infoHash: torrent.infoHash
          }

          for (const user of connectedUsers) {
            if (user.readyState === 1) {
              user.send(JSON.stringify({ status: 'delete', data: simpleTorrent }))
            }
          }
        }

      } else if (parsed.status === 'pauseTorrent') {
        const torrent = client.get(parsed.data.infoHash)
        if (torrent != null) {
          torrent.pause()
          torrent.wires = []
        }
      } else if (parsed.status === 'resumeTorrent') {
        const torrent = client.get(parsed.data.infoHash)
        for (let p in torrent._peers) {
          if (torrent._peers[p].wire != null) {
            torrent.wires.push(torrent._peers[p].wire)
          }
        }
        torrent.resume()
      }
    })
  })

  return router
}

const generateID = () => {
  return '_' + Math.random().toString(36).substr(2, 9)
}

const subscribeTorrents = (client, torrent) => {
  // Add torrents without extra information to array
  console.log('Loaded torrent ' + torrent.infoHash + ' from JSON, subscribing to events')

  if (torrent.timeRemaining === 0) {
    completeTorrent(torrent)
  }

  torrent.on('download', (bytes) => {
    sendDownloadInformation(torrent)
  })

  torrent.on('done', () => {
    completeTorrent(torrent)
  })
}

const sendDownloadInformation = (torrent) => {
  for (const user of connectedUsers) {
    const index = connectedUsers.map(e => { return e.id }).indexOf(user.id)
    if (user.readyState === 1) {
      user.send(JSON.stringify({ status: 'update', data: destructureTorrent(torrent) }))
    } else {
      console.log('Terminating' + user.id)
      connectedUsers.splice(index, 1)
      user.terminate()
    }
  }  
}

const completeTorrent = (torrent) => {
    console.log('Torrent complete')
    removeTorrent(torrent)
      .then(() => console.log('Removed torrent: ' + torrent.infoHash))
      .catch(e => {
        let err = e.toString()
        for (const user of connectedUsers) {
          if (user.readyState === 1) {
            user.send(JSON.stringify({ status: 'error', err }))
          }          
        }
      })

    torrent.removeListener('download', () => {
      console.log('Removed download listener for ' + torrent.infoHash)
    })

    for (const user of connectedUsers) {
      if (user.readyState === 1) {
        user.send(JSON.stringify({ status: 'delete', data: destructureTorrent(torrent) }))
      }
    }
}

const writeTorrent = (torrent) => {
  return new Promise((resolve, reject) => {
    fs.readFile(torrentFile, 'utf8', (err, data) => {
      if (err) return reject(err)
      let json
      try {
        json = JSON.parse(data)
      } catch (e) {
        return reject(e)
      }

      if (!json[torrent.infoHash]) {
        json[torrent.infoHash] = torrent
      }

      fs.writeFile(torrentFile, JSON.stringify(json, null, 4), (err) => {
        if (err) return reject(err)
        return resolve()
      })
    })
  })
}

const removeTorrent = (torrent) => {
  return new Promise((resolve, reject) => {
    fs.readFile(torrentFile, (err, data) => {
      if (err) reject(err)
      let json
      try {
        json = JSON.parse(data)
      } catch (e) {
        return reject(e)
      }

      delete json[torrent.infoHash]

      fs.writeFile(torrentFile, JSON.stringify(json, null, 4), (err) => {
        if (err) return reject(err)
        return resolve()
      })
    })
  })
}

const openTorrents = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(torrentFile, (err, data) => {
      if (err) return reject(err)
      let json
      try {
        json = JSON.parse(data)
      } catch (e) {
        return reject(e)
      }
      return resolve(json)
    })
  })
}

const destructureTorrent = (torrent) => {
  let file = {
    name: torrent.files[0].name,
    infoHash: torrent.infoHash,
    timeRemaining: torrent.timeRemaining,
    received: torrent.received,
    downloaded: torrent.downloaded,
    uploaded: torrent.uploaded,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    progress: torrent.progress,
    ratio: torrent.ratio,
    numPeers: torrent.numPeers,
    path: torrent.path
  }
  return file
}

function stringToSlug (str) {
  str = str.replace(/^\s+|\s+$/g, '') // trim
  str = str.toLowerCase()

  // remove accents, swap ñ for n, etc
  var from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;'
  var to = 'aaaaeeeeiiiioooouuuunc------'
  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i))
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes

  return str
}

module.exports = api

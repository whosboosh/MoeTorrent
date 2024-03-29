const { Router } = require('express')
const WebTorrent = require('webtorrent')
const checkDiskSpace = require('check-disk-space')
const os = require('os')
const path = require('path') 
const fs = require('fs')
require('events').EventEmitter.prototype._maxListeners = 100

const torrentFile = 'public/torrents.json'

const CONNECTED_USERS = []

const CURRENT_TORRENTS = {}

const TORRENT_QUEUE = []

let timeoutEnabled = true

let counter = 0

const Client = new WebTorrent()

const api = (expressWs) => {
  const router = Router()

  writeOnTimer() // Start a timer to write to disk every 60s

  Client.on('error', (error) => {
    let err = error.toString()
    for (const user of CONNECTED_USERS) {
      if (user.readyState === 1) {
        user.send(JSON.stringify({ status: 'error', err }))
      }
    }
  })

  // Add torrents to start downloading from previous opening
  openTorrents()
    .then(torrents => {
      for (const prop in torrents) {
        torrents[prop].timeout = timeout(60000, torrents[prop])
        CURRENT_TORRENTS[torrents[prop].infoHash] = torrents[prop]
        counter++
        let opts = {
          path: torrents[prop].path
        }
        new Promise((resolve) => {
          Client.add(torrents[prop].infoHash, opts, (parsedTorrent) => {
            parsedTorrent.on('error', (err) => {
              reject(err)
            })
            resolve(parsedTorrent)
          })
        })
          .then((torrent) => subscribeTorrents(torrent))
          .catch((err) => {
              for (const user of CONNECTED_USERS) {
                if (user.readyState === 1) {
                  user.send(JSON.stringify({ status: 'error', err }))
                }
              }
           })
      }
    })
    .catch(e => console.log(e))

  router.ws('/', (ws, req, next) => {
    const aWss = expressWs.getWss('/a')

    aWss.clients.forEach(user => {
      user.id = generateID()
      user.counter = 0
      if (CONNECTED_USERS.map(e => { return e.id }).indexOf(user.id) === -1) {
        CONNECTED_USERS.push(user)
      }
      let torrents = []
      for (const torrent of Client.torrents) {
        torrents.push(destructureTorrent(torrent))
      }
      if (user.readyState === 1) {
        user.send(JSON.stringify({ status: 'collection', data: torrents }))
      }
    }) 

    ws.on('message', (message) => {
      const parsed = JSON.parse(message)

      if (typeof parsed.data === 'undefined') {

        return next('No torrent provided')

      } else if (parsed.status === 'addTorrent') {

        console.log('Current length: '+Object.keys(CURRENT_TORRENTS).length)
        if (counter <= 10) { // Only allow torrent to be added if current queue length is under 10
          addTorrent(parsed)
        } else {
          TORRENT_QUEUE.push(parsed)
          console.log('Torrent added to queue as it is full')
        }

      } else if (parsed.status === 'removeTorrent') {
        console.log('Hello! from '+ ws.id)
        removeTorrent(parsed)

      } else if (parsed.status === 'pauseTorrent') {

        const torrent = Client.get(parsed.data.infoHash)
        if (torrent != null) {
          torrent.pause()
          torrent.wires = []
        }
        CURRENT_TORRENTS[torrent.infoHash].paused = true

      } else if (parsed.status === 'resumeTorrent') {

        const torrent = Client.get(parsed.data.infoHash)
        for (let p in torrent._peers) {
          if (torrent._peers[p].wire != null) {
            torrent.wires.push(torrent._peers[p].wire)
          }
        }
        CURRENT_TORRENTS[torrent.infoHash].paused = false
        torrent.resume()
      } else if (parsed.status === 'dead') {
        timeoutEnabled = !timeoutEnabled
        for (const user of CONNECTED_USERS) {
          if (user.readyState === 1) {
            user.send(JSON.stringify({ status: 'dead', data: timeoutEnabled }))
          }
        }
        for (let value of Object.keys(CURRENT_TORRENTS)) {
          clearTimeout(CURRENT_TORRENTS[value].timeout)
          CURRENT_TORRENTS[value].timeout = timeout(60000, CURRENT_TORRENTS[value])
        }
        console.log('Switched the timeout toggle: ' + timeoutEnabled)
      } else if (parsed.status === 'getDead') {
        for (const user of CONNECTED_USERS) {
          if (user.readyState === 1) {
            user.send(JSON.stringify({ status: 'dead', data: timeoutEnabled }))
          }
        }
      }
    })
  })

  return router
}

let timeouts = {}

const addTorrent = (parsed) => {
  // Add torrent to Client
  let opts = {}
  if (typeof parsed.location !== 'undefined') {
    opts = {
      path: `${parsed.location}\\${stringToSlug(parsed.title)}`
    }
  }
  counter++
  timeouts[parsed.data] = timeout(10000, parsed.data) // If torrent data cannot be resolved within 10 seconds
  Client.add(parsed.data, opts, async (torrent) => {
    clearTimeout(timeouts[parsed.data])

    let torrentPath = torrent.path
    if (parsed.location === '') {
      torrentPath = (os.platform == "win32") ? process.cwd().split(path.sep)[0] : "/"
    }

    // Check if disk has space
    freeSpace = await checkDiskSpace(torrentPath)

    if (torrent.length > freeSpace.free) {
      console.log('Deleting')
      for (const user of CONNECTED_USERS) {
        if (user.readyState === 1) {
          user.send(JSON.stringify({ status: 'error', err: `Insufficient disk space` }))
        }
      }
      return removeTorrent(parsed)
    }

    if (typeof TORRENT_QUEUE[0] !== 'undefined') {
      TORRENT_QUEUE.shift()
    }

    console.log('Torrent added')

    for (const user of CONNECTED_USERS) {
      if (user.readyState === 1) {
        user.send(JSON.stringify({ status: 'start', data: destructureTorrent(torrent) }))
      }
    }

    CURRENT_TORRENTS[torrent.infoHash] = destructureTorrent(torrent)

    CURRENT_TORRENTS[torrent.infoHash].timeout = timeout(60000, destructureTorrent(torrent)) // 2 mins to timeout if no download data is recieved

    torrent.on('download', () => {
      sendDownloadInformation(torrent)
    })

    torrent.on('done', () => {
      completeTorrent(torrent)
        .catch(e => console.log(e))
    })
  })
}

const removeTorrent = (parsed, timeout) => {
  console.log('Running remove torrent')
  let torrent
  if (typeof parsed.data.infoHash !== 'undefined') {
    torrent = Client.get(parsed.data.infoHash)
  } else {
    torrent = Client.get(parsed.data)
  }

  if (torrent == null) {
    return
  }

  if (typeof timeout !== 'undefined') {
    // Break code if timeout is not enabled
    if (!timeoutEnabled) {
      return
    }
    else if (timeoutEnabled && CURRENT_TORRENTS[torrent.infoHash].paused) {
      return
    }
  }

  if (torrent != null) {
    for (let p in torrent._peers) {
      if (torrent._peers[p].wire != null) {
        torrent.wires.push(torrent._peers[p].wire)
      }
    }
    torrent.resume()

    counter-- // Remove one from counter so queue is able to proceed


    // Don't send the delete message is the timeout is enabled
    if (typeof timeout !== 'undefined') {
      for (const user of CONNECTED_USERS) {
        if (user.readyState === 1) {
          parsed.data.timeout = {}
          user.send(JSON.stringify({ status: 'timeout', data: parsed.data }))
        }
      }
      return
    }

    for (const user of CONNECTED_USERS) {
      if (user.readyState === 1) {
        user.send(JSON.stringify({ status: 'delete', data: parsed.data }))
      }
    }

    Client.remove(torrent, (err) => {
      if (err) console.log(err)
      delete CURRENT_TORRENTS[torrent.infoHash]


      console.log('Deleted')
      // Add torrent to current torrents from queue
      if (typeof TORRENT_QUEUE[0] !== 'undefined') {
        console.table(TORRENT_QUEUE)
        addTorrent(TORRENT_QUEUE[0])
      }
    })
  }  
}

const generateID = () => {
  return '_' + Math.random().toString(36).substr(2, 9)
}

const subscribeTorrents = (torrent) => {
  // Add torrents without extra information to array
  console.log('Loaded torrent ' + torrent.infoHash + ' from JSON, subscribing to events')

  if (torrent.timeRemaining === 0) {
    completeTorrent(torrent)
      .catch(e => console.log(e))
  }

  torrent.on('download', (bytes) => {
    sendDownloadInformation(torrent)
  })

  torrent.on('done', () => {
    completeTorrent(torrent)
      .catch(e => console.log(e))  
  })
}

const timeout = (time, torrent) => {
  return setTimeout(() => {
    let parsed = {
      data: torrent
    }
    removeTorrent(parsed, true)
  }, time)
}

const sendDownloadInformation = (torrent) => {
  for (const user of CONNECTED_USERS) {
    const index = CONNECTED_USERS.map(e => { return e.id }).indexOf(user.id)
    let interval = calculateInterval(torrent)
    clearTimeout(CURRENT_TORRENTS[torrent.infoHash].timeout)

    CURRENT_TORRENTS[torrent.infoHash].timeout = timeout(60000, destructureTorrent(torrent))

    if (user.counter % interval === 0) { 
      if (user.readyState === 1) {
        user.send(JSON.stringify({ status: 'update', data: destructureTorrent(torrent) }))
      } else {
        console.log('Terminating' + user.id)
        CONNECTED_USERS.splice(index, 1)
        user.terminate()
      }
    }
    user.counter++
  }  
}

const calculateInterval = (torrent) => {
  let inHigh = 13491245
  let inLow = 1000

  let outLow = possibleIntervals[0]
  let outHigh = possibleIntervals[6]

  let inSpan = inHigh - inLow  
  let outSpan = outHigh - outLow

  let scaleFactor = parseFloat(outSpan) / parseFloat(inSpan)

  let num = torrent.downloadSpeed

  let interval =  outLow + (num - inLow)*scaleFactor
  return possibleIntervals.reduce((prev, curr) => {
    return (Math.abs(curr - interval) < Math.abs(prev - interval) ? curr : prev);
  })
  
}

const possibleIntervals = [1, 2, 4, 10, 50, 100, 200, 400]

const completeTorrent = (torrent) => {
  return new Promise((resolve, reject) => {
    console.log('Torrent complete')

    delete CURRENT_TORRENTS[torrent.infoHash]
    counter--

    // Add torrent to current torrents from queue
    if (typeof TORRENT_QUEUE[0] !== 'undefined') {
      addTorrent(TORRENT_QUEUE[0])
    }

    torrent.removeListener('download', () => {
      console.log('Removed download listener for ' + torrent.infoHash)
    })

    for (const user of CONNECTED_USERS) {
      if (user.readyState === 1) {
        user.send(JSON.stringify({ status: 'complete', data: destructureTorrent(torrent) }))
      }
    }
    resolve()
  })
}

const writeTorrents = () => {
  return new Promise((resolve, reject) => {
    for (let value of Object.keys(CURRENT_TORRENTS)) {
      CURRENT_TORRENTS[value].timeout = {}
    }
    fs.writeFile(torrentFile, JSON.stringify(CURRENT_TORRENTS, null, 4), (err) => {
      if (err) return reject(err)
      return resolve()
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
    name: typeof torrent.files[0] === 'undefined' ? '' : torrent.files[0].name,
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
    path: torrent.path,
    files: torrent.files.map(item => destructureFile(item)),
    paused: typeof torrent.paused !== 'undefined' ? torrent.paused : null,
  }
  return file
}

const destructureFile = (file) => {
  const _file = {
    name: file.name,
    path: file.path,
    length: file.length,
    downloaded: file.downloaded,
    progress: file.progress,
  }
  return _file
}

const writeOnTimer = () => {
  setInterval(() => {
    writeTorrents()
      .catch(e => console.log(e))
  }, 10000)
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

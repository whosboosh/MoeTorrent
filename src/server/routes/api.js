const { Router } = require('express')
const webTorrent = require('webtorrent')
const parseTorrent = require('parse-torrent')
const fs = require('fs')
const { resolve } = require('path') 

const torrentFile = 'public/torrents.json'

const api = () => {
  const router = Router()

  const client = new webTorrent()

  // Add torrents to start downloading from previous opening
  openTorrents()
    .then(torrents => {    
      for (const prop in torrents) {
        let opts = {
          path: torrents[prop].path  
        }          
        client.add(torrents[prop].infoHash, opts, (parsedTorrent) => {
          console.log('Loaded torrent'+parsedTorrent.infoHash+' from JSON')
        })
      }
    })
    .catch(e => console.log(e))


  // Get existing downloads
  router.get('/', async (req, res) => {
    // Add torrents without extra information to array
    const torrents = []
    for (const torrent of client.torrents) {
      let file = destructureTorrent(torrent)
      if (file.timeRemaining > 0) {
        torrents.push(file)
      }
    }
    res.status(200).json(torrents)
  })

  // Add a torrent
  router.post('/url', async (req, res, next) => {
    const torrent = req.body.url
    const title = req.body.title

    if (typeof title === 'undefined') {
      res.status(400)
      return next('Must provide a title')
    }

    if (typeof torrent === 'undefined') {
      res.status(400)
      return next('No torrent provided')
    }

    const opts = {
      path: `J:\\anime\\${string_to_slug(title)}`  
    }

    client.add(torrent, opts, (torrentFile) => {
      
      writeTorrent(destructureTorrent(torrentFile))
        .catch(e => {return next(e)})
      res.status(200).json({ status: 'Complete', torrent: torrentFile.infoHash })
    })

    client.on('error', (err) => {
      return next(err)
    })    
  })

  // Delete a torrent
  router.post('/remove', async (req, res, next) => {
    const torrent = req.body.url

    if (typeof torrent === 'undefined') {
      res.status(400)
      return next('No torrent provided')
    }    

    if (torrent.includes('.torrent')) {
      parseTorrent.remote(torrent, (err, parsed) => {
        if (err) return next(err)
        removeMiddleware(req, res, next, parsed)
      })
    } else {
      const parsed = parseTorrent(torrent)
      removeMiddleware(req, res, next, parsed)
    }
  })
  
  return router
}

const removeMiddleware = ((req, res, next, torrent) => {
  removeTorrent(torrent)
    .catch(e => {return next(e)})
  res.status(200).json('Torrent removed' + torrent)  
})

const writeTorrent = (torrent) => {
  return new Promise((resolve, reject) => {
    fs.readFile(torrentFile, 'utf8', (err, data) => {
      if (err) return reject(err)
      let json
      try {
        json = JSON.parse(data)
      } catch(e) {
        json = {}
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
      } catch(e) {
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
      try {
        json = JSON.parse(data)
      } catch(e) {
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

function string_to_slug(str) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  var to = "aaaaeeeeiiiioooouuuunc------";
  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
}

module.exports = api
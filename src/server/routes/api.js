const { Router } = require('express')
const webTorrent = require('webtorrent')

const api = () => {
  const router = Router()

  const client = new webTorrent()

  // Get existing downloads
  router.get('/', (req, res) => {

    // Add torrents without extra information to array
    const torrents = []
    for (const torrent of client.torrents) {
      let file = {
        name: torrent.files[0].name,
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
      if (file.timeRemaining > 0) {
        torrents.push(file)
      }
    }
    res.status(200).json(torrents)
  })

  // Add a torrent
  router.post('/url', (req, res, next) => {
    const file = req.body.url
    const title = req.body.title

    if (typeof title === 'undefined') {
      res.status(400)
      return next('Must provide an Anime title')
    }

    if (typeof file === 'undefined') {
      res.status(400)
      return next('No torrent provided')
    }

    const opts = {
      path: `J:\\anime\\${string_to_slug(title)}`  
    }

    client.add(file, opts, (torrent) => {
      res.status(200).json({ status: 'Complete', torrent: torrent.infoHash })
    })

    client.on('error', (err) => {
      next(err)
    })
  })

  // Delete a torrent
  router.post('/remove', (req, res, next) => {
    const torrent = req.body.url

    if (typeof torrent === 'undefined') {
      res.status(400)
      return next('No torrent provided')
    }    

    client.remove(torrent, (err) => {
      if (err) return next(err)
      else {
        res.status(200).json('Torrent removed' + torrent)
      }
    })

    client.on('error', (err) => {
      next(err)
    })
  })
  
  return router
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
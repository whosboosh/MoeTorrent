import { Router } from 'express'
import currentDownloads from '../../../downloads.json'
import webTorrent from 'webtorrent'
import fetch from 'node-fetch'
import fs from 'fs'

const downloads = () => {
  const router = Router()

  router.get('/', (req, res, next) => {
    res.status(200).json(currentDownloads)
  })

  return router
}

const url = () => {
  const router = Router()

  router.post('/', (req, res) => {
    const data = req.body
    const { magnet, torrent } = data


    if (typeof magnet === 'undefined' && torrent === 'undefined') {
      res.status(400)
      return next('Please enter a torrent file or a magnet')
    }

    const client = new webTorrent()

    if (typeof magnet !== 'undefined') {
      // Use magnet

      client.add(magnet, (torrent) => {
        console.log('Found torrent from magnet: '+torrent.infoHash)
      })


    } else {
      // Torrent file
      fetch(torrent)
        .then(res => {
            console.log(res)
            client.add(res, (torrent) => {
              torrent.on('infoHash', () => {
                writeToFile(torrent)
              })
              console.log('Found torrent from file: '+torrent.infoHash)
            })
            client.on('error', (e) => { throw Error(e) })            
        })
        .catch(e => {
          res.status(404)
          return next(e)
        })
    }
  })
}

const writeToFile = (torrent) => {
  fs.readFile('../../../downloads.json', 'utf8', (err, data) => {
    if (err) console.log(err)
    else {
    obj = JSON.parse(data)

    obj.table.push({ [torrent.infoHash]: torrent })

    json = JSON.stringify(obj)
    
    fs.writeFile('../../../downloads.json', json, 'utf8', (err) => {
      if (err) console.log(err)
    })
    }
  });
}

export {
  downloads,
  url
}
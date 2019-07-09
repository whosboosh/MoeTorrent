import express from 'express'
import cors from 'cors'
import React from 'react'
import { StaticRouter } from 'react-router-dom'
import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { getBundles } from 'react-loadable/webpack'
import manifest from '../../build/react-loadable.json'
import Loadable from 'react-loadable'
import expressStaticGzip from 'express-static-gzip'
import { resolve } from 'path'
import url from 'url'
import { matchPath } from 'react-router-dom'

// Client app import
import App from '../routes'
import routes from '../routes/routes'

const isProduction = process.env.NODE_ENV === 'production'

// Paths
const projectRoot = resolve(__dirname)
const buildFolder = resolve(projectRoot, 'build')

const app = express()

app.use(cors())


app.use(expressStaticGzip('build', {
  enableBrotli: true,
  orderPreference: ['br']
}))


//app.use(express.static('build'))

// Torrent server
const api = require('./routes/api')
const expressWs = require('express-ws')(app)
app.use('/api', api(expressWs))

const HTMLShell = (html, bundles, files, helmet) => `
<!DOCTYPE html>
<html>
  <head>
    ${helmet.title.toString()}
    ${helmet.link.toString()}
    ${helmet.meta.toString()} 
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">   
    <meta name="description" content="A webtorrent download client"/> 
    <title>MoeTorrent</title>
    ${ files['client.css'] ? `<link rel="stylesheet" type="text/css" href="${files['client.css']}" />` : ''}
  </head>
  <body>
    <div id="root" class="root">${html}</div>
    <script src="${files['vendor.js']}"></script>
    <script src="${files['client.js']}"></script>    
    ${bundles.map(file => {
      return `<script src="${file.publicPath}"></script>`
    }).join('\n')}
  </body>
</html>
`

app.get('*', async (req, res, next) => {
  try {
    const activeRoute = routes.find((route) => matchPath(url.parse(req.url).pathname, route)) || {}
    renderApp(req, res)
  } catch (e) {
    next(e)
  }
})

const renderApp = (req, res) => {
  const context = {}
  const modules = []

  const html = renderToString(
    <Loadable.Capture report={moduleName => modules.push(moduleName)}>
      <StaticRouter location={req.url} context={context}>
        <App />
      </StaticRouter>
    </Loadable.Capture>
  )

  const helmet = Helmet.renderStatic()

  if (context.url) {
    res.redirect(context.url)
    return
  }

  let files = {
    ['vendor.js']: `vendor.js`,
    ['client.js']: `client.js`,
    ['client.css']: isProduction && `css/client.css`,
  }

  let bundles = getBundles(manifest, modules)
  console.log(bundles)
  res.status(200).send(HTMLShell(html, bundles, files, helmet))
}

const errorHandler = (err, req, res, next) => {
  if (req.ws) {
    console.error("ERROR from WS route - ", err)
    req.ws.send(JSON.stringify({ status: 'error', err }))
  } else {
    console.error(err);
    res.setHeader('Content-Type', 'text/plain')
    res.status(500).send(err.stack)
  }
}

app.use(errorHandler) // Error handler middlware

Loadable.preloadAll().then(() => {
  app.listen(3001, () => {
    console.log('Server is listening on port 3001!')
  })
})
import express from 'express'
import cors from 'cors'
import React from 'react'
import { StaticRouter } from 'react-router-dom'
import serialize from 'serialize-javascript'
import { renderToString } from 'react-dom/server'
import { matchPath } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { getBundles } from 'react-loadable/webpack'
import manifest from '../../public/react-loadable.json'
import Loadable from 'react-loadable'
import url from 'url'
import files from '../../public/manifest.json'

// Routes import
import routes from '../shared/router/routes'

// Client app import
import App from '../shared/router'

const app = express()

app.use(cors())

app.use(express.static('public'))

const HTMLShell = (html, bundles, css, scripts, helmet, data) => `
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
    ${css.map(css => {
    return `<link rel="stylesheet" type="text/css" href="dist/${css}"></script>`
  }).join('\n')}    
  </head>
  <body>
    <div id="app" class="app">${html}</div>
    ${bundles.map(file => {
    return `<script src="/dist/${file.file}"></script>`
  }).join('\n')}
    ${scripts.map(script => {
    return `<script src="/dist/${script}"></script>`
  }).join('\n')}  
    <script>window.__INITIAL_DATA__ = ${serialize(data)}</script>    
  </body>
</html>
`
app.get('*', async (req, res, next) => {
  try {
    const activeRoute = routes.find((route) => matchPath(url.parse(req.url).pathname, route)) || {}

    const data = await activeRoute.fetchInitialData()

    renderApp(req, res, data)
  } catch (e) {
    next(e)
  }
})

const renderApp = (req, res, data) => {
  const context = {}
  const modules = []

  const html = renderToString(
    <Loadable.Capture report={moduleName => modules.push(moduleName)}>
      <StaticRouter location={req.url} context={context}>
        <App data={serialize(data)} />
      </StaticRouter>
    </Loadable.Capture>
  )

  const helmet = Helmet.renderStatic()

  if (context.url) {
    res.redirect(context.url)
    return
  }

  let css = []
  let scripts = []
  for (const key in files) {
    // files[key].substr(-3) === "css" ? css.push(files[key]) : {}
    key.slice(0, 1).match(/^\d/) === null && key.substr(-2) === 'js' && key !== 'vendors.js' ? scripts.push(files[key]) : {}
    key === 'client.css' ? css.push(files[key]) : {}
  }

  let bundles = getBundles(manifest, modules)
  res.status(200).send(HTMLShell(html, bundles, css, scripts, helmet, data))
}

Loadable.preloadAll().then(() => {
  app.listen(3002, () => {
    console.log('Server is listening on port 3002!')
  })
})

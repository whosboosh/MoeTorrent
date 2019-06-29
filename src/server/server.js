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
import axios from 'axios'

// Redux
import { Provider } from 'react-redux'
import { applyMiddleware } from 'redux'
import configureStore from '../shared/redux/store'

// Routes import
import routes from '../shared/router/routes'

// Client app import
import App from '../shared/router'

// API route
import api from '../api'
import { errorHandler } from '../api/middleware'

const app = express()

app.use(cors())

app.use(express.static('public'))
app.use('/api', api()) // Simple REST API to handle fetching / sending torrents to client

const HTMLShell = (html, bundles, css, scripts, helmet, store) => `
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
    <script>window.__INITIAL_STATE__ = ${serialize(store.getState())}</script>    
  </body>
</html>
`

app.get('*', async (req, res, next) => {
  try {
    const activeRoute = routes.find((route) => matchPath(url.parse(req.url).pathname, route)) || {}

    let initialState = {
      fetchDownloads: await axios.get(`http://localhost:3002/api/downloads`).data
    }

    const store = configureStore(initialState)

    renderApp(req, res, store)
  } catch (e) {
    next(e)
  }
})

const renderApp = (req, res, store) => {
  const context = {}
  const modules = []

  const html = renderToString(
    <Provider store={store}>
      <Loadable.Capture report={moduleName => modules.push(moduleName)}>
        <StaticRouter location={req.url} context={context}>
          <App />
        </StaticRouter>
      </Loadable.Capture>
    </Provider>
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
  res.status(200).send(HTMLShell(html, bundles, css, scripts, helmet, store))
}

app.use(errorHandler) // Error handler middlware
Loadable.preloadAll().then(() => {
  app.listen(3002, () => {
    console.log('Server is listening on port 3002!')
  })
})

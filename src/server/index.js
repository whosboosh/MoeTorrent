const express = require('express')
const cors = require('cors')
const { resolve } = require('path')
const expressStaticGzip = require('express-static-gzip')

const app = express()

app.use(cors())

// Paths
const projectRoot = resolve(__dirname)
const buildFolder = resolve(projectRoot, 'build')

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Torrent server
const api = require('./routes/api')
const expressWs = require('express-ws')(app)
app.use('/api', api(expressWs))

app.use('/', expressStaticGzip('build', {
    enableBrotli: true,
    orderPreference: ['br']
}))

// Main route
app.get('/', (req, res) => {
  res.sendFile(buildFolder + '/index.html')
})


if (process.env.NODE_ENV === 'development') {
  const webpack = require('webpack')
  const webpackConfig = require('../../webpack.config.js')

  const compiler = webpack(webpackConfig)
  app.use(
    require('webpack-dev-middleware')(compiler, {
      noInfo: true,
      publicPath: webpackConfig.output.publicPath,
      stats: false
    })
  )  
  app.use(require('webpack-hot-middleware')(compiler))
}


const errorHandler = (err, req, res, next) => {
  if(req.ws){
      console.error("ERROR from WS route - ", err)
      req.ws.send(JSON.stringify({ status: 'error', err }))
  } else {
      console.error(err);
      res.setHeader('Content-Type', 'text/plain')
      res.status(500).send(err.stack)
  }
}
app.use(errorHandler);


app.listen(3001, () =>
  console.log(`Started on port 3001!`)
)

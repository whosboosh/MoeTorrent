const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const { resolve } = require('path')

const webpack = require('webpack')
const webpackConfig = require('../../webpack.config.js')

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

app.use(express.static('build'))

const compiler = webpack(webpackConfig)

// Main route
app.get('/', (req, res) => {
  res.sendFile(buildFolder + '/index.html')
})

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

app.use(
  require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath,
    stats: false
  })
)

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
  app.use(require('webpack-hot-middleware')(compiler))
}

app.listen(3000, () =>
  console.log(`Started on port 3000!`)
)

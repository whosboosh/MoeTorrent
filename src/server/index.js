const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const { errorHandler } = require('./middleware')
const webpack = require('webpack')
const webpackConfig = require('../../webpack.config.js')
const { resolve } = require('path')

const app = express()

// Paths
const projectRoot = resolve(__dirname)
const buildFolder = resolve(projectRoot, 'build')

// Middleware
const api = require('./routes/api')

//app.use(morgan('dev'))
app.use(cors())

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(express.static('build'))

// Main route
app.get('/', (req, res) => {
  res.sendFile(buildFolder+'/index.html')
});

app.use('/api', api())

app.use(errorHandler) // Error handler middlware

const compiler = webpack(webpackConfig)

app.use(
  require("webpack-dev-middleware")(compiler, {
    noInfo: true,
    publicPath: webpackConfig.output.publicPath,
    stats: false
  })
)
app.use(require("webpack-hot-middleware")(compiler))

app.listen(3000, () =>
  console.log(`Started on port 3000!`)
)

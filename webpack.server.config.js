const webpackNodeExternals = require('webpack-node-externals')
const webpackMerge = require('webpack-merge')

const webpack = require('webpack')

const path = require('path')

const projectRoot = path.resolve(__dirname)
const srcPath = path.resolve(__dirname, 'src')
const buildFolder = path.resolve(__dirname, 'build')
const serverFolder = path.resolve(buildFolder, 'server')

const isProduction = process.env.NODE_ENV === 'production'

const babelRule = {
  test: /\.(js|tsx?)$/,
  use: 'babel-loader'
}

const sassRule = {
  test: /\.scss$/,
  use: 'null-loader'
}

const baseConfig = {
  target: 'node',
  devtool: !isProduction ? 'cheap-module-eval-source-map' : false,
  context: projectRoot,

  entry: {
    server: ['@babel/polyfill', `${srcPath}/server`]
  },

  output: {
    path: serverFolder,
    filename: '[name].js',
    publicPath: '/'
  },

  node: {
    __dirname: false
  },

  externals: [webpackNodeExternals()],

  module: {
    rules: [babelRule, sassRule]
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ]
}

const devConfig = webpackMerge(baseConfig, {
  mode: 'development',
})

const prodConfig = webpackMerge(baseConfig, {
  mode: 'production',
  optimization: {
    minimize: true,
    nodeEnv: 'production'
  }
})

module.exports = isProduction ? prodConfig : devConfig
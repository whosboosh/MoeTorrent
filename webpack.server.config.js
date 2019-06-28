const webpackNodeExternals = require('webpack-node-externals')
const webpackMerge = require('webpack-merge')

const webpack = require('webpack')

const path = require('path')

const srcPath = path.resolve(__dirname, 'src')
const distPath = path.resolve(__dirname, 'public/dist')

const isProduction = process.env.NODE_ENV === 'production'

const baseConfig = {
  target: 'node',
  devtool: !isProduction ? 'cheap-module-eval-source-map' : false,
  context: srcPath,
  entry: ['@babel/polyfill', `${srcPath}/server/server.js`],
  output: {
    path: distPath,
    filename: 'server.min.js'
  },
  node: {
    __dirname: false
  },
  externals: [webpackNodeExternals()],
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: 'null-loader'
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ]
}

const devConfig = webpackMerge(baseConfig, {
  mode: 'development',
  plugins: [
    new webpack.BannerPlugin({
      banner: 'require("source-map-support").install();',
      raw: true,
      entryOnly: false
    })
  ]
})

const prodConfig = webpackMerge(baseConfig, {
  mode: 'production',
  optimization: {
    minimize: true,
    nodeEnv: 'production'
  }
})

module.exports = isProduction ? prodConfig : devConfig

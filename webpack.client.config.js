const webpack = require('webpack')
const { resolve } = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpackMerge = require('webpack-merge')
const OptimizeCssAssetsWebpackPlugin = require('optimize-css-assets-webpack-plugin')
const BrotliPlugin = require('brotli-webpack-plugin')
const CompressionPlugin = require('compression-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { ReactLoadablePlugin } = require('react-loadable/webpack')

const isProduction = process.env.NODE_ENV === 'production'

const projectRoot = resolve(__dirname)
const sourceFolder = resolve(projectRoot, 'src')
const buildFolder = resolve(projectRoot, 'build')
const jsFolder = resolve(buildFolder, 'js')
// const torrentsFile = resolve(publicFolder, 'torrents.json')

const babelRule = {
  test: /\.(js|tsx?)$/,
  use: 'babel-loader'
}

const sassRule = {
  test: /\.scss$/,
  use: [
    isProduction
      ? {
        loader: MiniCssExtractPlugin.loader,
        options: {
          hmr: process.env.NODE_ENV === 'development',
          reloadAll: process.env.NODE_ENV === 'development'
        }
      }
      : {
        loader: 'style-loader',
        options: {
          singleton: true
        }
      },
    { loader: 'css-loader' },
    {
      loader: 'sass-loader'
    }
  ]
}

const baseConfig = {
  mode: 'none',

  target: 'web',

  context: projectRoot,

  output: {
    path: buildFolder,
    filename: '[name].js',
    publicPath: '/'
  },

  module: {
    rules: [babelRule, sassRule]
  },

  plugins: [
    //new CleanWebpackPlugin(),
    new ReactLoadablePlugin({
      filename: './build/react-loadable.json',
    })
  ]
}

const devConfig = {
  mode: 'development',

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
  ],

  devtool: 'inline-source-map',

  entry: {
    client: [
      '@babel/polyfill',
     'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000',
      resolve(sourceFolder, 'index')
    ],
    vendor: ['react', 'react-dom', 'react-router-dom']
  },

  output: {
    hotUpdateChunkFilename: '.hot/[id].[hash].hot-update.js',
    hotUpdateMainFilename: '.hot/[hash].hot-update.json'
  }
}

const prodConfig = {
  mode: 'production',

  entry: {
    client: [
      '@babel/polyfill',
      resolve(sourceFolder, 'index')
    ],
    vendor: ['react', 'react-dom', 'react-router-dom']
  },

  optimization: {
    minimize: true,
    nodeEnv: 'production'
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].css'
    }),

    new OptimizeCssAssetsWebpackPlugin(),

    new BrotliPlugin({
      asset: '[path].br[query]',
      test: /\.(js|css|html|svg)$/
    })
    /*
    new CompressionPlugin({
      test: /\.js(\?.*)?$/i,
      filename: '[path].gz[query]',
    })*/
  ],

  performance: {
    maxAssetSize: 1000 * 500, // 500KB
    // we only care about the size of compressed files
    assetFilter: (filename) => filename.endsWith('.br')
  }
}

const finalConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Running production config')
    return webpackMerge(baseConfig, prodConfig)
  } else {
    console.log('Running development config')
    return webpackMerge(baseConfig, devConfig)
  }
}

module.exports = finalConfig()

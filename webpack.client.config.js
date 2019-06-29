const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { ReactLoadablePlugin } = require('react-loadable/webpack')
const ManifestPlugin = require('webpack-manifest-plugin')
const webpackMerge = require('webpack-merge')
const webpack = require('webpack')

const path = require('path')

const srcPath = path.resolve(__dirname, 'src')
const distPath = path.resolve(__dirname, 'public/dist')

const isProduction = process.env.NODE_ENV === 'production'

const baseConfig = {
  target: 'web',
  entry: {
    client: [`./src/client/index.js`],
    vendor: ['react', 'react-dom', 'react-router-dom']
  },
  output: {
    path: distPath,
    publicPath: '',
    filename: isProduction ? '[name].min.js' : '[name].js'
  },
  devtool: !isProduction ? 'cheap-module-eval-source-map' : false,
  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: !isProduction
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: !isProduction
            }
          }
        ]
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader'
      }
    ]
  },
  plugins: [
    new ReactLoadablePlugin({
      filename: path.resolve(__dirname, 'public', 'react-loadable.json')
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    new MiniCssExtractPlugin({
      filename: !isProduction ? 'css/[name].css' : 'css/[name].[contenthash].css'
    }),
    new ManifestPlugin({
      fileName: path.resolve(__dirname, 'public', 'manifest.json')
    })
  ]
}

const devConfig = webpackMerge(baseConfig, {
  mode: 'development',
  optimization: {
    runtimeChunk: false,
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
})

const prodConfig = webpackMerge(baseConfig, {
  mode: 'production',
  optimization: {
    runtimeChunk: false,
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true
        }
      }
    },
    minimize: true,
    nodeEnv: 'production'
  }
})

module.exports = isProduction ? prodConfig : devConfig

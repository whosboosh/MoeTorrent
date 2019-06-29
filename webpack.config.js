const { resolve } = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpackMerge = require('webpack-merge')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
const OptimizeCssAssetsWebpackPlugin = require('optimize-css-assets-webpack-plugin')
const BrotliPlugin = require('brotli-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production'

const projectRoot = resolve(__dirname)
const sourceFolder = resolve(projectRoot, 'src')
const buildFolder = resolve(projectRoot, 'build')
const publicFolder = resolve(projectRoot, 'public')
const htmlTemplateFile = resolve(publicFolder, 'index.html')

const babelRule = {
  test: /\.(js|tsx?)$/,
  use: 'babel-loader',
}

const sassRule = {
  test: /\.scss$/,
  use: [
    isProduction
      ? MiniCssExtractPlugin.loader
      : {
        loader: 'style-loader',
        options: {
          singleton: true,
        },
      },
    { loader: 'css-loader' },
    {
      loader: 'sass-loader',
      options: {
        data: "@import './styles/_.scss';",
        includePaths: [sourceFolder],
      },
    },
  ],
}

const baseConfig = {
  mode: 'none',

  context: projectRoot,

  entry: ['@babel/polyfill', resolve(sourceFolder, 'index')],

  output: {
    filename: 'js/[name].js',
    path: buildFolder,
    publicPath: '/',
  },
  
  module: {
    rules: [babelRule, sassRule],
  },

  plugins: [
    new CopyWebpackPlugin([
      {
        from: publicFolder,
        ignore: [htmlTemplateFile],
      },
    ]),
    new CleanWebpackPlugin(),
  ],
}

const devConfig = {
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin({
      template: htmlTemplateFile,
      chunksSortMode: 'dependency',
    }),
  ],
  devtool: 'inline-source-map',
  devServer: {
    hot: true,
    historyApiFallback: true,
  },
}

const prodConfig = {
  mode: 'production',

  optimization: {
    minimize: true,
    nodeEnv: 'production',
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
    }),

    new OptimizeCssAssetsWebpackPlugin(),

    new HtmlWebpackPlugin({
      template: htmlTemplateFile,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
      inject: true,
    }),
    new HtmlWebpackInlineSourcePlugin(),
    new BrotliPlugin({
      asset: '[path].br[query]',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8
    }),
  ],

  performance: {
    maxAssetSize: 1000 * 500, // 500KB
    // we only care about the size of compressed files
    assetFilter: (filename) => filename.endsWith('.br'),
  },
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
const path = require('path')
const webpack = require('webpack')
const createThemeColorReplacerPlugin = require('./config/plugin.config')

const { name, port } = require('./package')

function resolve (dir) {
  return path.join(__dirname, dir)
}

const vueConfig = {
  runtimeCompiler: true,
  configureWebpack: {
    plugins: [
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
    ],
    resolve: {
      alias: {
        '@': resolve('src'),
        '#': resolve('public')
      }
    },
    output: {
      library: `${name}`,
      libraryTarget: 'umd',
      jsonpFunction: `webpackJsonp_${name}`
    }
  },
  chainWebpack: (config) => {
    config.resolve.alias
      .set('@$', resolve('src'))
      .set('#', resolve('public'))
  },
  css: {
    loaderOptions: {
      less: {
        modifyVars: {
          'border-radius-base': '2px'
        },
        javascriptEnabled: true
      }
    }
  },
  devServer: {
    port: port,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Internal-Admin-Key'
    },
    proxy: {
      '/open-api': {
        target: process.env.VUE_APP_OPEN_API_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
        pathRewrite: { '^/open-api': '' }
      }
    }
  },
  productionSourceMap: false,
  lintOnSave: false,
  transpileDependencies: []
}

if (process.env.VUE_APP_PREVIEW === 'true') {
  vueConfig.configureWebpack.plugins.push(createThemeColorReplacerPlugin())
}

module.exports = vueConfig

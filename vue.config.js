const path = require('path')
const webpack = require('webpack')
const createThemeColorReplacerPlugin = require('./config/plugin.config')

const { name, port } = require('./package')

function resolve (dir) {
  return path.join(__dirname, dir)
}

const createOpenPlatformDevProxy = require('./config/openPlatformDevProxy')

const vueConfig = {
  // 以下三行 dev / build 共用，勿按环境拆分（与 asset-other-manage 一致）
  // 本地：http://<host>:13021/openPlatform/
  // 发布：打进 page_vuln/openPlatform/ + openPlatform/static/
  publicPath: '/openPlatform',
  outputDir: 'dist/openPlatform',
  assetsDir: '../openPlatform/static',
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
    host: '0.0.0.0',
    disableHostCheck: true,
    port: port,
    // publicPath 非根路径时，history 路由须回退到子应用 index
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /^\/openPlatform/, to: '/openPlatform/index.html' }
      ]
    },
    // host 为 0.0.0.0 时，避免 sockjs 仍连 localhost 导致热更新/页面异常
    sockHost: '0.0.0.0',
    sockPort: port,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers':
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Internal-Admin-Key, X-Partner-Id, Idempotency-Key'
    },
    proxy: createOpenPlatformDevProxy()
  },
  productionSourceMap: false,
  lintOnSave: false,
  transpileDependencies: []
}

if (process.env.VUE_APP_PREVIEW === 'true') {
  vueConfig.configureWebpack.plugins.push(createThemeColorReplacerPlugin())
}

module.exports = vueConfig

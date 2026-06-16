/** devServer proxy: /open-api �� open-api-service�������ƹ����أ�strip ǰ׺�� */
function rewriteOpenApiPath (path) {
  if (path.indexOf('/open-api') === 0) {
    return path.replace(/^\/open-api/, '') || '/'
  }
  return path
}

function stripBackendCorsHeaders (proxyRes) {
  if (!proxyRes || !proxyRes.headers) return
  delete proxyRes.headers['access-control-allow-origin']
  delete proxyRes.headers['access-control-allow-credentials']
  delete proxyRes.headers['Access-Control-Allow-Origin']
  delete proxyRes.headers['Access-Control-Allow-Credentials']
}

module.exports = function createOpenApiDevProxy () {
  const target = process.env.VUE_APP_OPEN_API_PROXY_TARGET || 'http://127.0.0.1:35780'
  const common = {
    target,
    changeOrigin: true,
    pathRewrite: rewriteOpenApiPath,
    onProxyRes: stripBackendCorsHeaders
  }
  return {
    '/open-api': common
  }
}

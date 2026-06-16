/* eslint-disable camelcase */
if (window.__POWERED_BY_QIANKUN__) {
  let publicPath = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ || '/openPlatform/'
  if (/^https?:\/\//i.test(publicPath)) {
    try {
      publicPath = new URL(publicPath).pathname
    } catch (e) {
      publicPath = '/openPlatform/'
    }
  }
  if (!publicPath || publicPath === '/') {
    publicPath = '/openPlatform/'
  }
  if (!publicPath.endsWith('/')) {
    publicPath += '/'
  }
  // eslint-disable-next-line no-undef
  __webpack_public_path__ = publicPath
}

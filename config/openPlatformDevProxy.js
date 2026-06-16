/** devServer proxy��Admin �� ƽ̨���� 7000��Partner �� partner-gateway 35770 */
module.exports = function createOpenPlatformDevProxy () {
  const platformGateway = process.env.VUE_APP_GATEWAY_PROXY_TARGET || 'http://127.0.0.1:7000'
  const partnerGateway = process.env.VUE_APP_PARTNER_GATEWAY_PROXY_TARGET || 'http://127.0.0.1:35770'
  return {
    '/open-api-service': {
      target: platformGateway,
      changeOrigin: true
    },
    '/api/open/v1': {
      target: partnerGateway,
      changeOrigin: true
    },
    '/oauth/token': {
      target: partnerGateway,
      changeOrigin: true
    }
  }
}

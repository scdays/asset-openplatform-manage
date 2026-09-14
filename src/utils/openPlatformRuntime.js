/**
 * 运行时配置：window.conf / runtime-config.json / process.env
 */

function confValue (key) {
  const conf = window.conf
  if (conf && typeof conf === 'object' && conf[key] != null && conf[key] !== '') {
    return String(conf[key]).trim()
  }
  const env = process.env[key]
  if (env != null && env !== '') {
    return String(env).trim()
  }
  return ''
}

export function getOpenApiAdminKey () {
  return confValue('VUE_APP_OPEN_API_ADMIN_KEY')
}

export function hasOpenApiAdminKey () {
  return !!getOpenApiAdminKey()
}

export function getOpenApiBaseURLFromConf () {
  return confValue('VUE_APP_OPEN_API_BASE_URL') || '/open-api-service'
}

/**
 * platform-admin 控制面 baseURL（经平台网关 morningglory 服务发现路由到 platform-admin）。
 * 用于漏洞管理平台内部管理/查看接口；对外业务仍用 openApi/openPartner。
 */
export function getPlatformAdminBaseURLFromConf () {
  return confValue('VUE_APP_PLATFORM_ADMIN_BASE_URL') || '/platform-admin'
}

/**
 * 浏览器直连 Partner API 的 baseURL（仅当显式配置、需直连 partner-gateway 时使用）。
 * E2E 联调建议留空，走同源 /oauth/token、/api/open/v1 + devServer/nginx 反代，避免跨域 403。
 */
export function getOpenPartnerGatewayURLFromConf () {
  return confValue('VUE_APP_OPEN_PARTNER_GATEWAY_URL')
}

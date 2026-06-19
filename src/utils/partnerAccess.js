import { getOpenPartnerGatewayURLFromConf } from '@/utils/openPlatformRuntime'

/**
 * Partner 公网接入地址（partner-gateway），用于凭证交付 curl 展示。
 * 与浏览器 openPartnerRequest 分离：展示可用 host:35770，实际 E2E 请求走同源反代。
 */
export function getPartnerPublicBaseUrl () {
  const configured = getOpenPartnerGatewayURLFromConf() ||
    (typeof process !== 'undefined' && process.env && process.env.VUE_APP_OPEN_PARTNER_PUBLIC_BASE_URL)
  if (configured) {
    return String(configured).trim().replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol || 'http:'
    return `${protocol}//${window.location.hostname}:35770`
  }
  return 'http://127.0.0.1:35770'
}

export function getPartnerTokenUrl () {
  return `${getPartnerPublicBaseUrl()}/oauth/token`
}

export function getPartnerApiBaseUrl () {
  return `${getPartnerPublicBaseUrl()}/api/open/v1`
}

export function buildPartnerAccessBundle (clientId, clientSecret) {
  return {
    clientId,
    clientSecret,
    tokenUrl: getPartnerTokenUrl(),
    apiBase: getPartnerApiBaseUrl(),
    grantType: 'client_credentials'
  }
}

export function buildPartnerTokenCurl (clientId, clientSecret) {
  const tokenUrl = getPartnerTokenUrl()
  return `curl -X POST "${tokenUrl}" \\\n  -d "grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}"`
}

export function buildDeliveryGuideText (clientId, clientSecret, { maskSecret = true } = {}) {
  const publicBase = getPartnerPublicBaseUrl()
  const tokenUrl = getPartnerTokenUrl()
  const apiBase = getPartnerApiBaseUrl()
  const secret = maskSecret ? '***' : (clientSecret || '***')
  return [
    '第三方接入说明',
    '',
    '1. 获取 Token',
    `curl -X POST "${tokenUrl}" \\\n  -d "grant_type=client_credentials&client_id=${clientId || 'cli_xxx'}&client_secret=${secret}"`,
    '',
    '2. 创建任务（JSON 示例）',
    `curl -X POST "${apiBase}/tasks/vul" \\\n  -H "Authorization: Bearer {token}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"extTaskId":"demo-001","taskName":"联调任务"}'`,
    '',
    '3. 联调环境',
    `Partner 网关入口：${publicBase}`,
    '后端 mock 模式时实例数据来自 fixture，运营在「调用记录」观测。'
  ].join('\n')
}

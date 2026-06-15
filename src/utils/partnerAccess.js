/**
 * Partner 公网接入地址（Token / Open API），用于凭证交付与 DeliveryGuidePanel。
 * 配置 VUE_APP_OPEN_PUBLIC_BASE_URL，例如 https://open.example.com
 */
export function getPartnerPublicBaseUrl () {
  const configured = (process.env.VUE_APP_OPEN_PUBLIC_BASE_URL || '').trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  return 'https://open.example.com'
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

export function buildDeliveryGuideText (clientId, clientSecret) {
  const publicBase = getPartnerPublicBaseUrl()
  const tokenUrl = getPartnerTokenUrl()
  const apiBase = getPartnerApiBaseUrl()
  const maskedSecret = clientSecret ? '***' : '***'
  return [
    '第三方接入说明',
    '',
    '1. 获取 Token',
    `curl -X POST "${tokenUrl}" \\`,
    `  -d "grant_type=client_credentials&client_id=${clientId || 'cli_xxx'}&client_secret=${maskedSecret}"`,
    '',
    '2. 创建任务（JSON 示例）',
    `curl -X POST "${apiBase}/tasks/vul" \\`,
    '  -H "Authorization: Bearer {token}" \\',
    '  -H "Content-Type: application/json" \\',
    '  -d \'{"extTaskId":"demo-001","taskName":"联调任务"}\'',
    '',
    '3. 联调环境',
    `公网入口：${publicBase}`,
    '后端 mock 模式时实例数据来自 fixture，运营在「调用记录」观测。'
  ].join('\n')
}

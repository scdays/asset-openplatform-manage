import { getOpenPartnerGatewayURLFromConf } from '@/utils/openPlatformRuntime'

/**
 * Partner 公网网关（partner-gateway）基础地址。
 * - 未配置：返回 ''，浏览器走同源 /oauth/token、/api/open/v1（devServer/nginx 反代至 35770）
 * - 显式配置绝对 URL：浏览器直连 partner-gateway（需网关开启 CORS）
 */
export default function resolveOpenPartnerGatewayBaseURL () {
  const configured = getOpenPartnerGatewayURLFromConf().trim()
  if (!configured) {
    return ''
  }
  return configured.replace(/\/$/, '')
}

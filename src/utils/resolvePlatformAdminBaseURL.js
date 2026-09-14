import { getPlatformAdminBaseURLFromConf } from '@/utils/openPlatformRuntime'

/**
 * platform-admin 控制面 API baseURL（平台网关 /platform-admin，经 morningglory 服务发现路由）。
 * <p>仅用于漏洞管理平台内部管理/查看（Partner、Invocation、Webhook 投递记录、OperationCase 等）。
 * <p>对外业务（鉴权、REST API、接入测试、处置测试）仍走 openPartnerRequest → partner-gateway。
 */
export default function resolvePlatformAdminBaseURL () {
  const baseURL = getPlatformAdminBaseURLFromConf().trim()
  return baseURL.replace(/\/$/, '')
}

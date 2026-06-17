import { getOpenApiBaseURLFromConf } from '@/utils/openPlatformRuntime'

/**
 * Admin API baseURL（平台网关 /open-api-service，与 safeLeak 等子应用模式一致）。
 * Partner Open API 请使用 openPartnerRequest 走 partner-gateway，勿调用本方法。
 */
export default function resolveOpenApiBaseURL () {
  const baseURL = getOpenApiBaseURLFromConf().trim()
  return baseURL.replace(/\/$/, '')
}

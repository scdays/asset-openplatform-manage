import { getOpenApiBaseURLFromConf } from '@/utils/openPlatformRuntime'

/**
 * Admin API baseURL��ƽ̨���� /open-api-service���� safeLeak �ȷ�����ģʽһ�£���
 * Partner Open API ��ʹ�� openPartnerRequest �� partner-gateway������á�
 */
export default function resolveOpenApiBaseURL () {
  const baseURL = getOpenApiBaseURLFromConf().trim()
  const resolved = baseURL.replace(/\/$/, '')

  // #region agent log
  fetch('http://127.0.0.1:7874/ingest/023b9c15-9f3a-4c05-9179-99ba833b20c8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '9a4f66' }, body: JSON.stringify({ sessionId: '9a4f66', runId: 'partner-gw', hypothesisId: 'H-ADMIN', location: 'resolveOpenApiBaseURL.js', message: 'admin baseURL resolved', data: { baseURL: resolved }, timestamp: Date.now() }) }).catch(() => {})
  // #endregion

  return resolved
}

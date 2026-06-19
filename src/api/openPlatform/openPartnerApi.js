import openApiRequest from '@/utils/openApiRequest'
import openPartnerRequest, { setPartnerSession } from '@/utils/openPartnerRequest'

export const E2E_CAPABILITIES = [
  'TASK_READ', 'TASK_WRITE',
  'INSTANCE_READ', 'INSTANCE_VERIFY', 'INSTANCE_REMEDIATE',
  'INSTANCE_VERIFY_FIX', 'INSTANCE_ARCHIVE', 'EXPORT_READ', 'EVENT_SUBSCRIBE'
]

export function checkHealth () {
  return openApiRequest.get('/internal/health', { silent: true })
}

export function createE2ePartner (partnerId, partnerName) {
  return openApiRequest.post('/internal/admin/partners', {
    partnerId,
    partnerName: partnerName || `E2E Manual ${partnerId}`,
    partnerType: 'SIEM',
    capabilities: E2E_CAPABILITIES,
    rateLimitQps: 100
  })
}

export function createE2eCredential (partnerId) {
  return openApiRequest.post(`/internal/admin/partners/${encodeURIComponent(partnerId)}/credentials`)
}

export function fetchOAuthToken (clientId, clientSecret) {
  return openPartnerRequest.post('/oauth/token', {
    grantType: 'client_credentials',
    clientId,
    clientSecret
  }, { silent: true })
}

export function bindPartnerAuth (accessToken, partnerId, meta = {}) {
  setPartnerSession(accessToken, partnerId, meta)
}

export function createVulTask (payload) {
  return openPartnerRequest.post('/api/open/v1/tasks/vul', payload, { silent: true })
}

export function getTask (taskId) {
  return openPartnerRequest.get(`/api/open/v1/tasks/${encodeURIComponent(taskId)}`, { silent: true })
}

export function searchInstances (taskId, page = 1, size = 10) {
  return openPartnerRequest.post('/api/open/v1/instances/search', {
    taskId,
    page,
    size
  }, { silent: true })
}

export function listTaskExports (taskId, page = 1, size = 20) {
  return openPartnerRequest.get(`/api/open/v1/tasks/${encodeURIComponent(taskId)}/exports`, {
    params: { page, size },
    silent: true
  })
}

export function getExportMeta (exportId) {
  return openPartnerRequest.get(`/api/open/v1/exports/${encodeURIComponent(exportId)}`, { silent: true })
}

export function downloadPartnerExport (exportId) {
  return openPartnerRequest.get(`/api/open/v1/exports/${encodeURIComponent(exportId)}/download`, {
    responseType: 'blob',
    silent: true
  })
}

function toAsciiHeaderValue (value) {
  if (value == null || value === '') return value
  const s = String(value)
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\xFF]/.test(s)) return s
  // eslint-disable-next-line no-control-regex
  const ascii = s.replace(/[^\x00-\xFF]/g, '')
  return ascii || `e2e-${Date.now()}`
}

function idempotencyHeaders (idempotencyKey) {
  if (!idempotencyKey) return undefined
  return { 'Idempotency-Key': toAsciiHeaderValue(idempotencyKey) }
}

export function verifyInstance (vulInfoId, body, idempotencyKey) {
  return openPartnerRequest.post(
    `/api/open/v1/instances/${encodeURIComponent(vulInfoId)}/verify`,
    body,
    {
      silent: true,
      headers: idempotencyHeaders(idempotencyKey)
    }
  )
}

export function remediateInstance (vulInfoId, body, idempotencyKey) {
  return openPartnerRequest.post(
    `/api/open/v1/instances/${encodeURIComponent(vulInfoId)}/remediate`,
    body,
    {
      silent: true,
      headers: idempotencyHeaders(idempotencyKey)
    }
  )
}

export function verifyFixInstance (vulInfoId, body, idempotencyKey) {
  return openPartnerRequest.post(
    `/api/open/v1/instances/${encodeURIComponent(vulInfoId)}/verify-fix`,
    body,
    {
      silent: true,
      headers: idempotencyHeaders(idempotencyKey)
    }
  )
}

export function getInstance (vulInfoId) {
  return openPartnerRequest.get(`/api/open/v1/instances/${encodeURIComponent(vulInfoId)}`, { silent: true })
}

function postBatch (path, body, idempotencyKey) {
  const payload = body && body.items ? body : { items: body }
  return openPartnerRequest.post(path, payload, {
    silent: true,
    headers: idempotencyHeaders(idempotencyKey)
  })
}

/** @param request {{ operator: string, items: object[] }} */
export function verifyInstanceBatch (request, idempotencyKey) {
  const body = request && request.items
    ? request
    : { operator: '', items: Array.isArray(request) ? request : [] }
  return postBatch('/api/open/v1/instances/verify:batch', body, idempotencyKey)
}

/** @param request {{ items: object[] }} */
export function remediateInstanceBatch (request, idempotencyKey) {
  return postBatch('/api/open/v1/instances/remediate:batch', request, idempotencyKey)
}

/** @param request {{ items: object[] }} */
export function verifyFixInstanceBatch (request, idempotencyKey) {
  return postBatch('/api/open/v1/instances/verify-fix:batch', request, idempotencyKey)
}

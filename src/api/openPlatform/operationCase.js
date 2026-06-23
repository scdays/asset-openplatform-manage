import openApiRequest from '@/utils/openApiRequest'
import { normalizeListPayload, unwrapOpenApiPayload } from '@/utils/openApiPayload'

const PREFIX = '/internal/admin/operation-cases'

function removeEmptyParams (params) {
  const result = {}
  Object.keys(params || {}).forEach(key => {
    const value = params[key]
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  })
  return result
}

function normalizeOperationCasePage (res, defaultPage, defaultSize) {
  const raw = unwrapOpenApiPayload(res) || {}
  const items = normalizeListPayload(raw)
  const page = Number(raw.page || raw.pageNo || defaultPage || 1)
  const size = Number(raw.size || raw.pageSize || defaultSize || 20)
  const total = Number(
    raw.total !== undefined && raw.total !== null
      ? raw.total
      : (raw.totalCount !== undefined && raw.totalCount !== null ? raw.totalCount : items.length)
  )
  return { items, page, size, total }
}

export function listOperationCases (params = {}) {
  const query = removeEmptyParams({
    page: params.page || params.pageNo || 1,
    size: params.size || params.pageSize || 20,
    partnerId: params.partnerId,
    caseType: params.caseType,
    status: params.status,
    primaryResourceId: params.primaryResourceId,
    caseId: params.caseId,
    startedFrom: params.startedFrom,
    startedTo: params.startedTo
  })
  return openApiRequest.get(PREFIX, { params: query }).then(res => {
    return normalizeOperationCasePage(res, query.page, query.size)
  })
}

export function getOperationCaseWorkspace (caseId) {
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(caseId)}/workspace`)
}

export function backfillOperationCases (params = {}) {
  return openApiRequest.post(`${PREFIX}/backfill`, null, {
    params: {
      partnerId: params.partnerId,
      limit: params.limit || 200,
      dryRun: params.dryRun === true
    }
  })
}

export function retryOperationCaseDispatch (caseId, params = {}) {
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(caseId)}/actions/retry-dispatch`,
    null,
    { params: { scanPhase: params.scanPhase, subId: params.subId } }
  )
}

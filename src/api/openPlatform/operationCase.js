import openApiRequest from '@/utils/openApiRequest'

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
  return openApiRequest.get(PREFIX, { params: query })
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

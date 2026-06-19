import openApiRequest from '@/utils/openApiRequest'

const PREFIX = '/internal/admin/verify-fix'

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

/** 修复核验列表 */
export function listVerifyFixJobs (params = {}) {
  return openApiRequest.get(`${PREFIX}/jobs`, {
    params: removeEmptyParams({
      partnerId: params.partnerId,
      status: params.status,
      taskId: params.taskId,
      jobId: params.jobId,
      limit: params.limit || 50
    })
  })
}

/** 修复核验工作台 */
export function getVerifyFixWorkspace (jobId) {
  return openApiRequest.get(`${PREFIX}/jobs/${encodeURIComponent(jobId)}/workspace`)
}

/** 重新获取复扫子任务扫描结果（phase=3） */
export function refetchVerifyFixRescanResults (jobId, subId) {
  return openApiRequest.post(
    `${PREFIX}/jobs/${encodeURIComponent(jobId)}/rescan-refetch`,
    null,
    { params: { subId }, silent: true }
  )
}

/** 待修复核验实例列表（列表页「进行中」筛选） */
export function listVerifyFixPendingInstances (partnerId, options = {}) {
  const params = { partnerId, limit: options.limit || 200 }
  if (options.taskId) params.taskId = options.taskId
  if (options.jobId) params.jobId = options.jobId
  return openApiRequest.get(`${PREFIX}/pending-instances`, { params })
}

/** task-center scannerType → 展示名 */
export function scannerTypeLabel (scannerType) {
  if (scannerType == null || scannerType === '') return '-'
  const key = String(scannerType)
  if (key === '1') return '绿盟(1)'
  if (key === '7') return 'Nessus(7)'
  return `扫描器(${key})`
}

import openApiRequest from '@/utils/openApiRequest'

const PREFIX = '/internal/admin/open-tasks'

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

export function listOpenTasks (params = {}) {
  const query = removeEmptyParams({
    page: params.page || params.pageNo || 1,
    size: params.size || params.pageSize || 20,
    partnerId: params.partnerId,
    taskId: params.taskId,
    extTaskId: params.extTaskId,
    status: params.status,
    scanTemplateId: params.scanTemplateId,
    vulnType: params.vulnType
  })
  return openApiRequest.get(PREFIX, { params: query })
}

export function getOpenTaskWorkspace (taskId) {
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(taskId)}/workspace`)
}

export function retryOpenTaskDispatch (taskId, params = {}) {
  const query = removeEmptyParams({
    scanPhase: params.scanPhase != null ? params.scanPhase : 1,
    subId: params.subId
  })
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(taskId)}/retry-dispatch`,
    null,
    { params: query, silent: true }
  )
}

export function getOpenTaskSurveyResults (taskId, params = {}) {
  const query = removeEmptyParams({
    scanPhase: params.scanPhase != null ? params.scanPhase : 1,
    subId: params.subId
  })
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(taskId)}/survey-results`, { params: query })
}

export function refetchOpenTaskSurveyResults (taskId, subId) {
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(taskId)}/survey-refetch`,
    null,
    { params: { subId }, silent: true }
  )
}

/** 重新获取单个子任务的原始扫描报告（重新下载并归档到文件服务） */
export function refetchOpenTaskSubReport (taskId, subId) {
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(taskId)}/subs/${encodeURIComponent(subId)}/report-refetch`,
    null,
    { silent: true }
  )
}

/** 重新获取该任务下所有未归档/失败子任务的原始扫描报告 */
export function refetchAllOpenTaskReports (taskId) {
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(taskId)}/report-refetch-all`,
    null,
    { silent: true }
  )
}

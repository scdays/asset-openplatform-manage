import openApiRequest from '@/utils/openApiRequest'
import { resolveUploadFile } from '@/api/openPlatform/mockTask'

const PREFIX = '/internal/admin/mock-verify-fix'

function buildXmlForm (file) {
  const raw = resolveUploadFile(file)
  if (!raw) {
    throw new Error('未选择有效的 XML 文件')
  }
  const form = new FormData()
  form.append('file', raw, raw.name || 'rescan.xml')
  return form
}

export function listVerifyFixJobs (params = {}) {
  return openApiRequest.get(`${PREFIX}/jobs`, { params })
}

export function getVerifyFixJob (jobId) {
  return openApiRequest.get(`${PREFIX}/jobs/${encodeURIComponent(jobId)}`)
}

export function importVerifyFixRescanXml (jobId, file) {
  return openApiRequest.post(
    `${PREFIX}/jobs/${encodeURIComponent(jobId)}/import-rescan-xml`,
    buildXmlForm(file),
    { timeout: 180000 }
  )
}

export function completeVerifyFixAllFixed (jobId) {
  return openApiRequest.post(`${PREFIX}/jobs/${encodeURIComponent(jobId)}/complete-all-fixed`)
}

export function completeVerifyFixAllUnfixed (jobId) {
  return openApiRequest.post(`${PREFIX}/jobs/${encodeURIComponent(jobId)}/complete-all-unfixed`)
}

export function completeVerifyFixByCompare (jobId) {
  return openApiRequest.post(`${PREFIX}/jobs/${encodeURIComponent(jobId)}/complete-by-compare`)
}

export function getOfflineTaskVerifyFixContext (partnerId, taskId) {
  return openApiRequest.get(`${PREFIX}/offline-tasks/${encodeURIComponent(taskId)}/context`, {
    params: { partnerId }
  })
}

export function createInternalVerifyFixJob (payload) {
  return openApiRequest.post(`${PREFIX}/jobs/create-from-offline-task`, payload)
}

/** @deprecated 请使用 openVulnInstance.listOpsVulnInstances */
export function listMockVulnInstances (partnerId, options = {}) {
  const params = { partnerId, limit: options.limit || 200 }
  if (options.taskId) params.taskId = options.taskId
  if (options.vulInfoStat != null && options.vulInfoStat !== '') {
    params.vulInfoStat = options.vulInfoStat
  }
  return openApiRequest.get('/internal/admin/open-vuln-instances', { params })
}

export function listVerifyFixInvocationCandidates (partnerId, limit = 100) {
  return openApiRequest.get(`${PREFIX}/invocation-candidates`, {
    params: { partnerId, limit }
  })
}

export function createVerifyFixJobFromSelection (payload) {
  return openApiRequest.post(`${PREFIX}/jobs/create-from-selection`, payload)
}

import openApiRequest from '@/utils/openApiRequest'

const PREFIX = '/internal/admin/mock-tasks'

/** Ant Design Upload / native input 统一取原始 File */
export function resolveUploadFile (file) {
  if (!file) return null
  if (file instanceof File || file instanceof Blob) return file
  if (file.originFileObj instanceof File || file.originFileObj instanceof Blob) {
    return file.originFileObj
  }
  return null
}

function buildReportForm (file) {
  const raw = resolveUploadFile(file)
  if (!raw) {
    throw new Error('未选择有效的 XML 文件')
  }
  const form = new FormData()
  const name = raw.name || 'report.xml'
  form.append('file', raw, name)
  return form
}

export function getDispatchPacket (taskId) {
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(taskId)}/dispatch-packet`)
}

export function getBundleStatus (taskId) {
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(taskId)}/bundle-status`)
}

export function previewMockReport (taskId, file, sampleSize = 10) {
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(taskId)}/preview-report`,
    buildReportForm(file),
    {
      params: { sampleSize },
      timeout: 120000
    }
  )
}

export function importMockReport (taskId, file, force = false) {
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(taskId)}/import-report`,
    buildReportForm(file),
    {
      params: { force },
      timeout: 180000
    }
  )
}

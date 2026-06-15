import openApiRequest from '@/utils/openApiRequest'

const PREFIX = '/internal/admin/mock-tasks'

export function getDispatchPacket (taskId) {
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(taskId)}/dispatch-packet`)
}

export function getBundleStatus (taskId) {
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(taskId)}/bundle-status`)
}

export function previewMockReport (taskId, file, sampleSize = 10) {
  const form = new FormData()
  form.append('file', file)
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(taskId)}/preview-report`,
    form,
    { params: { sampleSize } }
  )
}

export function importMockReport (taskId, file, force = false) {
  const form = new FormData()
  form.append('file', file)
  return openApiRequest.post(
    `${PREFIX}/${encodeURIComponent(taskId)}/import-report`,
    form,
    { params: { force } }
  )
}

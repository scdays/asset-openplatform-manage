/**
 * 统一解析 Open API / Partner API 响应体（兼容已解包与仍带 data 嵌套）。
 */
export function unwrapOpenApiPayload (res) {
  if (res == null || typeof res !== 'object') return res
  if (res.taskId != null || res.extTaskId != null || res.jobId != null || res.clientId != null) {
    return res
  }
  if (Array.isArray(res)) return res
  if (res.data != null && typeof res.data === 'object') {
    return unwrapOpenApiPayload(res.data)
  }
  return res
}

export function pickTaskId (res) {
  const body = unwrapOpenApiPayload(res)
  if (!body || typeof body !== 'object') return ''
  return String(body.taskId || body.platformTaskId || '').trim()
}

export function normalizeListPayload (data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.records)) return data.records
  if (Array.isArray(data.list)) return data.list
  return []
}

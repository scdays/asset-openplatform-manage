function buildMap (items) {
  const map = {}
  items.forEach(item => {
    map[item.value] = item
  })
  return map
}

export const PARTNER_STATUSES = [
  { value: 'ACTIVE', label: '启用', color: 'green' },
  { value: 'DISABLED', label: '停用', color: 'red' }
]

export const PARTNER_TYPES = [
  { value: 'SIEM', label: 'SIEM 安全信息与事件管理', color: 'blue' },
  { value: 'ITSM', label: 'ITSM IT 服务管理', color: 'blue' },
  { value: 'SECOPS', label: 'SecOps 安全运营', color: 'blue' },
  { value: 'CUSTOM', label: '自定义接入', color: 'default' }
]

export const CREDENTIAL_STATUSES = [
  { value: 'ACTIVE', label: '有效', color: 'green' },
  { value: 'DISABLED', label: '已停用', color: 'red' }
]

export const API_OPERATION_STATUSES = [
  { value: 'PUBLISHED', label: '已发布', color: 'green' },
  { value: 'DEPRECATED', label: '已废弃', color: 'orange' },
  { value: 'DISABLED', label: '已禁用', color: 'red' }
]

export const OPENAPI_TAGS = [
  { value: 'auth', label: '鉴权', color: 'purple' },
  { value: 'tasks', label: '任务', color: 'blue' },
  { value: 'instances', label: '实例', color: 'cyan' },
  { value: 'exports', label: '外发', color: 'gold' },
  { value: 'webhooks', label: 'Webhook', color: 'geekblue' }
]

export const DOMAINS = [
  { value: 'AUTH', label: '鉴权', color: 'purple' },
  { value: 'TASK', label: '任务', color: 'blue' },
  { value: 'INSTANCE', label: '实例', color: 'cyan' },
  { value: 'EXPORT', label: '外发', color: 'gold' },
  { value: 'WEBHOOK', label: 'Webhook', color: 'geekblue' }
]

export const CAPABILITIES = [
  { value: 'NONE', label: '无需能力', color: 'default' },
  { value: 'TASK_WRITE', label: '任务写入', color: 'blue' },
  { value: 'TASK_READ', label: '任务读取', color: 'blue' },
  { value: 'INSTANCE_READ', label: '实例读取', color: 'cyan' },
  { value: 'INSTANCE_VERIFY', label: '实例验证', color: 'cyan' },
  { value: 'INSTANCE_REMEDIATE', label: '实例修复', color: 'cyan' },
  { value: 'INSTANCE_ARCHIVE', label: '实例备案', color: 'cyan' },
  { value: 'INSTANCE_VERIFY_FIX', label: '修复核验', color: 'cyan' },
  { value: 'EXPORT_READ', label: '外发读取', color: 'gold' },
  { value: 'EVENT_SUBSCRIBE', label: '事件订阅', color: 'geekblue' }
]

export const WEBHOOK_DELIVERY_STATUSES = [
  { value: 'SUCCESS', label: '投递成功', color: 'green' },
  { value: 'FAILED', label: '投递失败', color: 'red' },
  { value: 'PENDING', label: '待投递', color: 'orange' }
]

export const WEBHOOK_EVENT_TYPES = [
  { value: 'TASK_COMPLETED', label: '任务完成', color: 'green' },
  { value: 'TASK_FAILED', label: '任务失败', color: 'red' },
  { value: 'INSTANCE_VERIFY_FIX_COMPLETED', label: '修复核验完成', color: 'cyan' },
  { value: 'EXPORT_READY', label: '外发就绪', color: 'gold' }
]

export const OPEN_TASK_STATUSES = [
  { value: 'RUNNING', label: '运行中', color: 'blue' },
  { value: 'FINISHED', label: '已完成', color: 'green' },
  { value: 'FAILED', label: '失败', color: 'red' },
  { value: 'ACCEPTED', label: '已受理', color: 'default' }
]

export const MOCK_INGEST_MODES = [
  { value: 'auto', label: '自动完成', color: 'default' },
  { value: 'manual', label: '半人工', color: 'orange' }
]

export const HTTP_METHODS = [
  { value: 'GET', label: 'GET', color: 'green' },
  { value: 'POST', label: 'POST', color: 'blue' },
  { value: 'PUT', label: 'PUT', color: 'gold' },
  { value: 'DELETE', label: 'DELETE', color: 'red' },
  { value: 'PATCH', label: 'PATCH', color: 'orange' }
]

const REGISTRY = {
  partnerStatus: buildMap(PARTNER_STATUSES),
  partnerType: buildMap(PARTNER_TYPES),
  credentialStatus: buildMap(CREDENTIAL_STATUSES),
  apiOperationStatus: buildMap(API_OPERATION_STATUSES),
  openapiTag: buildMap(OPENAPI_TAGS),
  domain: buildMap(DOMAINS),
  capability: buildMap(CAPABILITIES),
  webhookDeliveryStatus: buildMap(WEBHOOK_DELIVERY_STATUSES),
  webhookEventType: buildMap(WEBHOOK_EVENT_TYPES),
  openTaskStatus: buildMap(OPEN_TASK_STATUSES),
  mockIngestMode: buildMap(MOCK_INGEST_MODES),
  httpMethod: buildMap(HTTP_METHODS)
}

const OPTIONS_REGISTRY = {
  partnerStatus: PARTNER_STATUSES,
  partnerType: PARTNER_TYPES,
  credentialStatus: CREDENTIAL_STATUSES,
  apiOperationStatus: API_OPERATION_STATUSES,
  openapiTag: OPENAPI_TAGS,
  domain: DOMAINS,
  capability: CAPABILITIES,
  webhookDeliveryStatus: WEBHOOK_DELIVERY_STATUSES,
  webhookEventType: WEBHOOK_EVENT_TYPES,
  openTaskStatus: OPEN_TASK_STATUSES,
  mockIngestMode: MOCK_INGEST_MODES,
  httpMethod: HTTP_METHODS
}

export function labelOf (type, value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback !== undefined ? fallback : '-'
  }
  const key = String(value)
  const item = REGISTRY[type] && REGISTRY[type][key]
  if (item) {
    return item.label
  }
  return fallback !== undefined ? fallback : key
}

export function colorOf (type, value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback || 'default'
  }
  const key = String(value)
  const item = REGISTRY[type] && REGISTRY[type][key]
  return (item && item.color) || fallback || 'default'
}

export function optionsOf (type, { includeAll = false, allLabel = '全部' } = {}) {
  const list = OPTIONS_REGISTRY[type] || []
  if (!includeAll) {
    return list.map(item => ({ value: item.value, label: item.label, color: item.color }))
  }
  return [{ value: '', label: allLabel, color: 'default' }].concat(
    list.map(item => ({ value: item.value, label: item.label, color: item.color }))
  )
}

export function capabilityLabel (code) {
  return labelOf('capability', code, code)
}

export function formatTags (tags) {
  if (!tags || (Array.isArray(tags) && !tags.length)) {
    return '-'
  }
  const list = Array.isArray(tags) ? tags : String(tags).split(',').map(v => v.trim()).filter(Boolean)
  if (!list.length) {
    return '-'
  }
  return list.map(tag => labelOf('openapiTag', tag, tag)).join('、')
}

export function formatHttpStatus (httpStatus) {
  if (httpStatus == null) return '-'
  if (httpStatus < 0) return '网络错误'
  if (httpStatus >= 200 && httpStatus < 300) return String(httpStatus)
  if (httpStatus >= 400 && httpStatus < 500) return `${httpStatus} 客户端错误`
  if (httpStatus >= 500) return `${httpStatus} 服务端错误`
  return String(httpStatus)
}

export function httpStatusColor (httpStatus) {
  if (httpStatus == null || httpStatus < 0) return 'red'
  if (httpStatus >= 200 && httpStatus < 300) return 'green'
  return 'orange'
}
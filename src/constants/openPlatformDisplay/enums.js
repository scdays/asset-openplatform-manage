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
  { value: 'PENDING', label: '待投递', color: 'orange' },
  { value: 'SKIPPED', label: '已跳过', color: 'orange' }
]

export const WEBHOOK_EVENT_TYPES = [
  { value: 'TASK_COMPLETED', label: '任务完成', color: 'green' },
  { value: 'TASK_FAILED', label: '任务失败', color: 'red' },
  { value: 'INSTANCE_VERIFY_FIX_COMPLETED', label: '修复核验完成', color: 'cyan' },
  { value: 'EXPORT_READY', label: '外发就绪', color: 'gold' },
  { value: 'ARTIFACT_READY', label: '报告产物就绪', color: 'gold' }
]

/** 外发阶段 exportStage（与后端 ExportStage 常量对齐，控制哪些产物可下载） */
export const EXPORT_STAGES = [
  { value: 'TASK_COMPLETED', label: '任务完成外发包', color: 'blue' },
  { value: 'VERIFY_SCAN', label: '验证扫描外发', color: 'cyan' },
  { value: 'VERIFY_FIX_SCAN', label: '修复核验扫描外发', color: 'purple' },
  { value: 'RAW_SCAN_ARCHIVE', label: '原始扫描报告', color: 'gold' }
]

export const OPEN_TASK_STATUSES = [
  { value: 'RUNNING', label: '运行中', color: 'blue' },
  { value: 'FINISHED', label: '已完成', color: 'green' },
  { value: 'FAILED', label: '失败', color: 'red' },
  { value: 'DISPATCH_FAILED', label: '下发失败', color: 'orange' },
  { value: 'ACCEPTED', label: '已受理', color: 'default' }
]

export const OPERATION_CASE_TYPES = [
  { value: 'TASK_SCAN', label: '扫描任务', color: 'blue' },
  { value: 'INSTANCE_VERIFY', label: '实例验证', color: 'cyan' },
  { value: 'INSTANCE_REMEDIATE', label: '实例处置', color: 'cyan' },
  { value: 'VERIFY_FIX', label: '修复核验', color: 'purple' },
  { value: 'INSTANCE_BATCH', label: '批量实例', color: 'gold' }
]

/** 运营案件主资源类型（open_operation_case.primary_resource_type） */
export const PRIMARY_RESOURCE_TYPES = [
  { value: 'TASK', label: '扫描任务', color: 'blue' },
  { value: 'INSTANCE', label: '漏洞实例', color: 'cyan' },
  { value: 'VERIFY_FIX_JOB', label: '修复核验作业', color: 'purple' }
]

export const OPERATION_CASE_STATUSES = [
  { value: 'ACCEPTED', label: '已受理', color: 'default' },
  { value: 'RUNNING', label: '进行中', color: 'blue' },
  { value: 'FINISHED', label: '已完成', color: 'green' },
  { value: 'FAILED', label: '失败', color: 'red' },
  { value: 'PARTIAL_FAILED', label: '部分失败', color: 'orange' },
  { value: 'CANCELLED', label: '已取消', color: 'orange' }
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

/** OpenAPI operationId（与 api_operation 种子 / OpenApiOperations 对齐） */
export const API_OPERATIONS = [
  { value: 'issuePartnerToken', label: '获取 Partner 访问令牌', color: 'purple' },
  { value: 'createTask', label: '创建扫描任务（已废弃）', color: 'default' },
  { value: 'createTaskByJson', label: '创建扫描任务（JSON）', color: 'blue' },
  { value: 'createTaskByFile', label: '创建扫描任务（XML 配置）', color: 'blue' },
  { value: 'createTaskByUpload', label: '创建扫描任务（上传文件）', color: 'blue' },
  { value: 'listTasks', label: '分页查询任务列表', color: 'blue' },
  { value: 'getTask', label: '查询任务进度', color: 'blue' },
  { value: 'searchInstances', label: '搜索漏洞实例', color: 'cyan' },
  { value: 'getInstance', label: '获取漏洞实例详情', color: 'cyan' },
  { value: 'verifyInstance', label: '验证漏洞实例', color: 'cyan' },
  { value: 'verifyInstanceBatch', label: '批量验证漏洞实例', color: 'cyan' },
  { value: 'remediateInstance', label: '处置修复（单条）', color: 'cyan' },
  { value: 'remediateInstanceBatch', label: '批量处置修复', color: 'cyan' },
  { value: 'archiveInstance', label: '处置备案（单条）', color: 'cyan' },
  { value: 'archiveInstanceLegacy', label: '处置备案（兼容别名）', color: 'default' },
  { value: 'verifyFixInstance', label: '修复核验（单条）', color: 'cyan' },
  { value: 'verifyFixInstanceBatch', label: '批量修复核验', color: 'cyan' },
  { value: 'getExport', label: '查询外发包元数据', color: 'gold' },
  { value: 'downloadExport', label: '下载外发文件', color: 'gold' },
  { value: 'listTaskExports', label: '查询任务外发列表', color: 'gold' }
]

/** 附录 A · vulInfoStat */
export const VUL_INFO_STATS = [
  { value: 0, label: '潜在预警', color: 'default' },
  { value: 1, label: '初始发现', color: 'blue' },
  { value: 2, label: '已验证有效', color: 'green' },
  { value: 3, label: '已验证误报', color: 'orange' },
  { value: 5, label: '已修复', color: 'cyan' },
  { value: 6, label: '核验修复', color: 'green' },
  { value: 7, label: '核验未修复', color: 'red' },
  { value: 8, label: '验证失败', color: 'red' },
  { value: 9, label: '修复失败', color: 'red' },
  { value: 10, label: '核验失败', color: 'red' }
]

/** 危害等级 vulLevel（部侧码表） */
export const VUL_LEVELS = [
  { value: 0, label: '信息', color: 'default' },
  { value: 1, label: '低危', color: 'green' },
  { value: 2, label: '中危', color: 'gold' },
  { value: 3, label: '高危', color: 'orange' },
  { value: 4, label: '超危', color: 'red' }
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
  exportStage: buildMap(EXPORT_STAGES),
  openTaskStatus: buildMap(OPEN_TASK_STATUSES),
  operationCaseType: buildMap(OPERATION_CASE_TYPES),
  primaryResourceType: buildMap(PRIMARY_RESOURCE_TYPES),
  operationCaseStatus: buildMap(OPERATION_CASE_STATUSES),
  mockIngestMode: buildMap(MOCK_INGEST_MODES),
  httpMethod: buildMap(HTTP_METHODS),
  apiOperation: buildMap(API_OPERATIONS),
  vulInfoStat: buildMap(VUL_INFO_STATS),
  vulLevel: buildMap(VUL_LEVELS)
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
  exportStage: EXPORT_STAGES,
  openTaskStatus: OPEN_TASK_STATUSES,
  operationCaseType: OPERATION_CASE_TYPES,
  primaryResourceType: PRIMARY_RESOURCE_TYPES,
  operationCaseStatus: OPERATION_CASE_STATUSES,
  mockIngestMode: MOCK_INGEST_MODES,
  httpMethod: HTTP_METHODS,
  apiOperation: API_OPERATIONS,
  vulInfoStat: VUL_INFO_STATS,
  vulLevel: VUL_LEVELS
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

/** 中文标签(原始值)，如 初始发现(1)、批量验证漏洞实例(verifyInstanceBatch) */
export function labelWithCode (type, value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback !== undefined ? fallback : '-'
  }
  const label = labelOf(type, value, String(value))
  return `${label}(${value})`
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

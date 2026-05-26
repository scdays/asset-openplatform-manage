/** 开放平台能力码（与原型 / api_operation 种子对齐） */
export const OPEN_PLATFORM_CAPABILITIES = [
  { code: 'TASK_WRITE', label: '任务写入 TASK_WRITE' },
  { code: 'TASK_READ', label: '任务读取 TASK_READ' },
  { code: 'INSTANCE_READ', label: '实例读取 INSTANCE_READ' },
  { code: 'INSTANCE_VERIFY', label: '实例验证 INSTANCE_VERIFY' },
  { code: 'INSTANCE_REMEDIATE', label: '实例修复 INSTANCE_REMEDIATE' },
  { code: 'INSTANCE_ARCHIVE', label: '实例备案 INSTANCE_ARCHIVE' },
  { code: 'INSTANCE_VERIFY_FIX', label: '修复核验 INSTANCE_VERIFY_FIX' },
  { code: 'EXPORT_READ', label: '外发读取 EXPORT_READ' },
  { code: 'EVENT_SUBSCRIBE', label: '事件订阅 EVENT_SUBSCRIBE' }
]

export const PARTNER_TYPES = [
  { value: 'SIEM', label: 'SIEM' },
  { value: 'ITSM', label: 'ITSM' },
  { value: 'SECOPS', label: 'SECOPS' },
  { value: 'CUSTOM', label: 'CUSTOM' }
]

export const PARTNER_STATUSES = [
  { value: 'ACTIVE', label: '启用', color: 'green' },
  { value: 'DISABLED', label: '停用', color: 'red' }
]

export function capabilityLabel (code) {
  const item = OPEN_PLATFORM_CAPABILITIES.find(c => c.code === code)
  return item ? item.label : code
}

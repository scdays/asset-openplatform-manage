/**
 * Webhook 投递 -> 流量治理列表的跳转 query（仅传 partnerId + resourceId）。
 * 不传 resourceType，避免 Webhook(EXPORT) 与 Invocation(TASK) 类型不一致导致查不到。
 */
export function resolveInvocationLinkQuery (record) {
  if (!record || !record.partnerId) {
    return null
  }
  const eventType = record.eventType
  let resourceId = record.resourceId

  if (eventType === 'EXPORT_READY' && record.relatedTaskId) {
    resourceId = record.relatedTaskId
  }

  if (!resourceId) {
    return null
  }

  return {
    partnerId: record.partnerId,
    resourceId
  }
}

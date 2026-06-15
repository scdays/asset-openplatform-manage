import openApiRequest from '@/utils/openApiRequest'

const INVOCATION_PREFIX = '/internal/admin/invocations'
const WEBHOOK_DELIVERY_PREFIX = '/internal/admin/webhook-deliveries'
const PARTNER_PREFIX = '/internal/admin/partners'

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

export function listInvocations (params = {}) {
  const query = removeEmptyParams({
    page: params.page || params.pageNo || 1,
    size: params.size || params.pageSize || 10,
    partnerId: params.partnerId,
    operationId: params.operationId,
    domain: params.domain,
    response_code: params.responseCode,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    startedFrom: params.startedFrom,
    startedTo: params.startedTo
  })
  return openApiRequest.get(INVOCATION_PREFIX, { params: query })
}

export function getInvocationDetail (invocationId) {
  return openApiRequest.get(`${INVOCATION_PREFIX}/${encodeURIComponent(invocationId)}`)
}

export function getInvocationResponseBody (invocationId) {
  return openApiRequest.get(`${INVOCATION_PREFIX}/${encodeURIComponent(invocationId)}/response-body`)
}

export function getPartnerStats (partnerId) {
  return openApiRequest.get(`${PARTNER_PREFIX}/${encodeURIComponent(partnerId)}/stats`)
}

export function listWebhookDeliveries (params = {}) {
  const query = removeEmptyParams({
    page: params.page || params.pageNo || 1,
    size: params.size || params.pageSize || 10,
    partnerId: params.partnerId,
    eventType: params.eventType,
    status: params.status,
    resourceType: params.resourceType,
    resourceId: params.resourceId
  })
  return openApiRequest.get(WEBHOOK_DELIVERY_PREFIX, { params: query })
}

export function getWebhookDeliveryDetail (deliveryId) {
  return openApiRequest.get(`${WEBHOOK_DELIVERY_PREFIX}/${encodeURIComponent(deliveryId)}`)
}

export function retryWebhookDelivery (deliveryId) {
  return openApiRequest.post(`${WEBHOOK_DELIVERY_PREFIX}/${encodeURIComponent(deliveryId)}/retry`)
}

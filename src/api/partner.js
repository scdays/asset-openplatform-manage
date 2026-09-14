import platformAdminRequest from '@/utils/platformAdminRequest'

const PREFIX = '/internal/admin/partners'

export function listPartners (params) {
  return platformAdminRequest.get(PREFIX, {
    params: {
      page: params.page || params.pageNo || 1,
      size: params.size || params.pageSize || 20
    }
  })
}

export function getPartner (partnerId) {
  return platformAdminRequest.get(`${PREFIX}/${encodeURIComponent(partnerId)}`)
}

export function createPartner (data) {
  return platformAdminRequest.post(PREFIX, data)
}

export function updatePartner (partnerId, data) {
  return platformAdminRequest.put(`${PREFIX}/${encodeURIComponent(partnerId)}`, data)
}

export function listCredentials (partnerId) {
  return platformAdminRequest.get(`${PREFIX}/${encodeURIComponent(partnerId)}/credentials`)
}

export function createCredential (partnerId) {
  return platformAdminRequest.post(`${PREFIX}/${encodeURIComponent(partnerId)}/credentials`)
}

export function rotateWebhookSecret (partnerId) {
  return platformAdminRequest.post(`${PREFIX}/${encodeURIComponent(partnerId)}/webhook-secret/rotate`)
}

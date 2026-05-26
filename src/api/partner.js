import openApiRequest from '@/utils/openApiRequest'

const PREFIX = '/internal/admin/partners'

export function listPartners (params) {
  return openApiRequest.get(PREFIX, {
    params: {
      page: params.page || params.pageNo || 1,
      size: params.size || params.pageSize || 20
    }
  })
}

export function getPartner (partnerId) {
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(partnerId)}`)
}

export function createPartner (data) {
  return openApiRequest.post(PREFIX, data)
}

export function updatePartner (partnerId, data) {
  return openApiRequest.put(`${PREFIX}/${encodeURIComponent(partnerId)}`, data)
}

export function listCredentials (partnerId) {
  return openApiRequest.get(`${PREFIX}/${encodeURIComponent(partnerId)}/credentials`)
}

export function createCredential (partnerId) {
  return openApiRequest.post(`${PREFIX}/${encodeURIComponent(partnerId)}/credentials`)
}

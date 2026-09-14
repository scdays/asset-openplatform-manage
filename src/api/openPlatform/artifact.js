import openApiRequest from '@/utils/openApiRequest'

const ARTIFACT_PREFIX = '/internal/admin/artifacts'

export function downloadAdminArtifact (partnerId, artifactId) {
  return openApiRequest.get(`${ARTIFACT_PREFIX}/${encodeURIComponent(artifactId)}/download`, {
    params: { partnerId },
    responseType: 'blob'
  })
}

export function downloadAdminArtifactByEventId (partnerId, eventId) {
  return openApiRequest.get(`/internal/admin/webhook-events/${encodeURIComponent(eventId)}/artifact/download`, {
    params: { partnerId },
    responseType: 'blob'
  })
}

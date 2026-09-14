import openApiRequest from '@/utils/openApiRequest'

const EXPORT_PREFIX = '/internal/admin/exports'

export function downloadAdminExport (partnerId, exportId) {
  return openApiRequest.get(`${EXPORT_PREFIX}/${encodeURIComponent(exportId)}/download`, {
    params: { partnerId },
    responseType: 'blob'
  })
}

export function downloadAdminExportByEventId (partnerId, eventId) {
  return openApiRequest.get(`/internal/admin/webhook-events/${encodeURIComponent(eventId)}/export/download`, {
    params: { partnerId },
    responseType: 'blob'
  })
}

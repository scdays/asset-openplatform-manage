import openApiRequest from '@/utils/openApiRequest'

const EXPORT_PREFIX = '/internal/admin/exports'

export function downloadAdminExport (partnerId, exportId) {
  return openApiRequest.get(`${EXPORT_PREFIX}/${encodeURIComponent(exportId)}/download`, {
    params: { partnerId },
    responseType: 'blob'
  })
}

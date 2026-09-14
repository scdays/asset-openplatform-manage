import { message } from 'ant-design-vue'
import { downloadAdminExportByEventId } from '@/api/openPlatform/export'
import { downloadAdminArtifactByEventId } from '@/api/openPlatform/artifact'

/**
 * 是否可下载外发：record.downloadable 且 eventType=EXPORT_READY。
 */
export function canDownloadExport (record) {
  return !!(record && record.downloadable && record.eventType === 'EXPORT_READY')
}

/**
 * 是否可下载产物：record.downloadable 且 eventType=ARTIFACT_READY。
 */
export function canDownloadArtifact (record) {
  return !!(record && record.downloadable && record.eventType === 'ARTIFACT_READY')
}

function parseContentDisposition (disposition) {
  if (!disposition) return null
  const quoted = /filename\*=UTF-8''([^;\s]+)/i.exec(disposition)
  if (quoted) {
    try { return decodeURIComponent(quoted[1]) } catch (e) { return quoted[1] }
  }
  const basic = /filename="([^"]+)"/i.exec(disposition) || /filename=([^;\s]+)/i.exec(disposition)
  if (basic) { return basic[1].replace(/"/g, '') }
  return null
}

function triggerDownload (record, apiCall, fallbackPrefix, successMsg) {
  if (!record || !record.eventId || !record.partnerId) {
    return Promise.reject(new Error('当前记录缺少下载所需信息'))
  }
  return apiCall(record.partnerId, record.eventId).then(response => {
    const blob = response.data
    const disposition = response.headers && (response.headers['content-disposition'] || response.headers['Content-Disposition'])
    const fileName = parseContentDisposition(disposition) || `${fallbackPrefix}-${record.eventId}`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(successMsg)
  })
}

export function triggerExportDownloadByEventId (record) {
  return triggerDownload(record, downloadAdminExportByEventId, 'export', '外发文件已开始下载')
}

export function triggerArtifactDownloadByEventId (record) {
  return triggerDownload(record, downloadAdminArtifactByEventId, 'artifact', '报告产物已开始下载')
}

import { message } from 'ant-design-vue'
import { downloadAdminExport } from '@/api/openPlatform/export'
import { downloadAdminArtifact } from '@/api/openPlatform/artifact'

/**
 * EXPORT_READY：平台管理 API 下载结构化外发（json/xml）。
 */
export function canDownloadExportDelivery (record) {
  if (!record || !record.exportId || !record.partnerId) {
    return false
  }
  return record.eventType === 'EXPORT_READY' && record.exportDownloadable === true
}

/**
 * ARTIFACT_READY：平台管理 API 下载原始扫描报告产物。
 */
export function canDownloadArtifactDelivery (record) {
  if (!record || !record.artifactId || !record.partnerId) {
    return false
  }
  return record.eventType === 'ARTIFACT_READY' && record.artifactDownloadable === true
}

function parseContentDisposition (disposition) {
  if (!disposition) return null
  const quoted = /filename\*=UTF-8''([^;\s]+)/i.exec(disposition)
  if (quoted) {
    try {
      return decodeURIComponent(quoted[1])
    } catch (e) {
      return quoted[1]
    }
  }
  const basic = /filename="([^"]+)"/i.exec(disposition) || /filename=([^;\s]+)/i.exec(disposition)
  if (basic) {
    return basic[1].replace(/"/g, '')
  }
  return null
}

export function guessExportFileName (record, disposition) {
  const fromHeader = parseContentDisposition(disposition)
  if (fromHeader) return fromHeader
  const fmt = (record && record.exportFormat) || 'bin'
  const exportId = (record && record.exportId) || 'export'
  return `export-${exportId}.${fmt}`
}

export function guessArtifactFileName (record, disposition) {
  const fromHeader = parseContentDisposition(disposition)
  if (fromHeader) return fromHeader
  const fmt = (record && record.artifactFormat) || 'bin'
  const artifactId = (record && record.artifactId) || 'artifact'
  return `artifact-${artifactId}.${fmt}`
}

export function triggerExportDownload (record) {
  if (!canDownloadExportDelivery(record)) {
    return Promise.reject(new Error('当前记录不可下载外发文件'))
  }
  return downloadAdminExport(record.partnerId, record.exportId).then(response => {
    const blob = response.data
    const disposition = response.headers && (
      response.headers['content-disposition'] || response.headers['Content-Disposition']
    )
    const fileName = guessExportFileName(record, disposition)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('外发文件已开始下载')
  })
}

export function triggerArtifactDownload (record) {
  if (!canDownloadArtifactDelivery(record)) {
    return Promise.reject(new Error('当前记录不可下载报告产物'))
  }
  return downloadAdminArtifact(record.partnerId, record.artifactId).then(response => {
    const blob = response.data
    const disposition = response.headers && (
      response.headers['content-disposition'] || response.headers['Content-Disposition']
    )
    const fileName = guessArtifactFileName(record, disposition)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('报告产物已开始下载')
  })
}

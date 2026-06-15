import { message } from 'ant-design-vue'
import { downloadAdminExport } from '@/api/openPlatform/export'

export function canDownloadExportDelivery (record) {
  return !!(record && record.exportDownloadable === true && record.exportId && record.partnerId)
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

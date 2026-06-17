/**
 * 复制文本到剪贴板。优先 Clipboard API，降级 textarea + execCommand（适配 qiankun / 非 HTTPS）。
 */
export function copyToClipboard (text) {
  if (text == null || text === '') {
    return Promise.reject(new Error('empty'))
  }
  const value = String(text)
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value).catch(() => fallbackCopy(value))
  }
  return fallbackCopy(value)
}

function fallbackCopy (text) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('no document'))
      return
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', 'readonly')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    try {
      const ok = document.execCommand('copy')
      if (ok) {
        resolve()
      } else {
        reject(new Error('execCommand failed'))
      }
    } catch (e) {
      reject(e)
    } finally {
      document.body.removeChild(ta)
    }
  })
}

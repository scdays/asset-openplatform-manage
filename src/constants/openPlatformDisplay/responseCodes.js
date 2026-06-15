export const RESPONSE_CODES = {
  0: { label: '成功', color: 'green', severity: 'success' },
  40001: { label: '参数错误', color: 'orange', severity: 'warning' },
  40002: { label: '状态无效', color: 'orange', severity: 'warning' },
  40003: { label: '跨 Partner 访问', color: 'red', severity: 'error' },
  40004: { label: '类型无效', color: 'orange', severity: 'warning' },
  40005: { label: '重复操作', color: 'orange', severity: 'warning' },
  40101: { label: '鉴权失败', color: 'red', severity: 'error' },
  40301: { label: '能力未开通', color: 'red', severity: 'error' },
  40901: { label: '幂等冲突', color: 'orange', severity: 'warning' },
  50001: { label: '引擎调用失败', color: 'red', severity: 'error' },
  50002: { label: 'Webhook 处理失败', color: 'red', severity: 'error' }
}

export function responseCodeLabel (code) {
  if (code === undefined || code === null || code === '') {
    return '-'
  }
  const num = Number(code)
  const item = RESPONSE_CODES[num]
  if (item) {
    return item.label
  }
  return '未知错误'
}

export function responseCodeColor (code) {
  if (code === undefined || code === null || code === '') {
    return 'default'
  }
  const num = Number(code)
  const item = RESPONSE_CODES[num]
  if (item) {
    return item.color
  }
  return 'red'
}

export function formatResponseCode (code, { showCode = true } = {}) {
  if (code === undefined || code === null || code === '') {
    return '-'
  }
  const num = Number(code)
  const label = responseCodeLabel(num)
  if (num === 0) {
    return label
  }
  if (showCode) {
    return `${label} (${num})`
  }
  return label
}

export function responseCodeOptions ({ includeAll = false } = {}) {
  const items = Object.keys(RESPONSE_CODES).map(key => {
    const num = Number(key)
    return { value: num, label: `${RESPONSE_CODES[num].label} (${num})` }
  })
  if (!includeAll) {
    return items
  }
  return [{ value: '', label: '全部' }].concat(items)
}
import { labelWithCode } from './enums'

const FIELD_TYPE_MAP = {
  vulInfoStat: 'vulInfoStat',
  prevStat: 'vulInfoStat',
  vulLevel: 'vulLevel'
}

function walk (node, hints, seen) {
  if (node == null) return
  if (Array.isArray(node)) {
    node.forEach(item => walk(item, hints, seen))
    return
  }
  if (typeof node !== 'object') return
  Object.keys(node).forEach(key => {
    const val = node[key]
    const type = FIELD_TYPE_MAP[key]
    if (type != null && (typeof val === 'number' || (typeof val === 'string' && val !== '' && !Number.isNaN(Number(val))))) {
      const num = Number(val)
      const hintKey = `${key}=${num}`
      if (!seen.has(hintKey)) {
        seen.add(hintKey)
        hints.push({ field: key, value: num, text: labelWithCode(type, num) })
      }
    }
    walk(val, hints, seen)
  })
}

/** 从 JSON 文本提取 vulInfoStat / vulLevel 等枚举释义 */
export function collectEnumHintsFromJson (text) {
  if (!text || typeof text !== 'string') return []
  try {
    const data = JSON.parse(text)
    const hints = []
    walk(data, hints, new Set())
    return hints
  } catch (e) {
    return []
  }
}

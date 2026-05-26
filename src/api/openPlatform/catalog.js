import openApiRequest from '@/utils/openApiRequest'

const API_OPERATION_PREFIX = '/internal/admin/api-operations'
const DOC_PREFIX = '/internal/admin/developer-docs'
const INVOCATION_PREFIX = '/internal/admin/invocations'

function removeEmptyParams (params) {
  const result = {}
  Object.keys(params || {}).forEach(key => {
    const value = params[key]
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  })
  return result
}

function normalizeListData (raw, defaultPage, defaultSize) {
  const source = raw || {}
  const list = source.items || source.list || source.records || source.rows || source.content || source.data || []
  const page = Number(source.page || source.pageNo || source.current || defaultPage || 1)
  const size = Number(source.size || source.pageSize || defaultSize || 10)
  const totalRaw = source.total
  const totalCountRaw = source.totalCount
  const countRaw = source.count
  const total = Number(
    totalRaw !== undefined
      ? totalRaw
      : (totalCountRaw !== undefined
          ? totalCountRaw
          : (countRaw !== undefined ? countRaw : (Array.isArray(list) ? list.length : 0)))
  )
  return {
    items: Array.isArray(list) ? list : [],
    page,
    size,
    total
  }
}

function parseDocList (raw) {
  const source = raw || {}
  const list = source.items || source.list || source.records || source.rows || source.content || source.data || []
  if (!Array.isArray(list)) return []
  return list.map(item => ({
    name: item.name || item.title || item.docName || item.type || '未命名文档',
    type: item.type || item.docType || 'SPEC',
    url: item.url || item.link || item.href || item.entryUrl || '',
    description: item.description || item.desc || ''
  }))
}

function buildCatalogFallback (params) {
  const page = params.page || params.pageNo || 1
  const size = params.size || params.pageSize || 10
  return openApiRequest.get(INVOCATION_PREFIX, {
    params: { page: 1, size: 200 },
    silent: true
  }).then(data => {
    const normalized = normalizeListData(data, 1, 200)
    const map = {}
    normalized.items.forEach(item => {
      const operationId = item.operationId || item.operationCode
      if (!operationId) return
      const tagText = item.tags || item.tag || item.module
      const tags = Array.isArray(tagText)
        ? tagText
        : (tagText ? String(tagText).split(',').map(v => v.trim()).filter(Boolean) : [])
      if (!map[operationId]) {
        map[operationId] = {
          operationId,
          operationName: item.operationName || operationId,
          capabilityCode: item.capabilityCode || item.capability || '-',
          status: item.status || 'UNKNOWN',
          tags,
          method: item.httpMethod || item.method || '-',
          path: item.requestPath || item.path || '-',
          source: 'invocation-fallback'
        }
      }
    })
    const allItems = Object.keys(map).map(key => map[key])
    return {
      items: allItems.slice((page - 1) * size, page * size),
      page,
      size,
      total: allItems.length,
      fallback: true
    }
  }).catch(() => ({
    items: [],
    page,
    size,
    total: 0,
    fallback: true
  }))
}

export function listApiCatalogOperations (params = {}) {
  const page = params.page || params.pageNo || 1
  const size = params.size || params.pageSize || 10
  const query = removeEmptyParams({
    page,
    size,
    capabilityCode: params.capabilityCode,
    status: params.status,
    tag: params.tag,
    keyword: params.keyword
  })
  return openApiRequest.get(API_OPERATION_PREFIX, {
    params: query,
    silent: true
  }).then(data => {
    const normalized = normalizeListData(data, page, size)
    return Object.assign({}, normalized, { fallback: false })
  }).catch(() => buildCatalogFallback(params))
}

export function listDeveloperDocs () {
  return openApiRequest.get(DOC_PREFIX, {
    params: { page: 1, size: 50 },
    silent: true
  }).then(data => {
    const docs = parseDocList(data)
    if (docs.length) return docs
    return []
  }).catch(() => [])
}


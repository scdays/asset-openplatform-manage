import { listPartners } from '@/api/partner'
import { getPartnerStats } from '@/api/openPlatform/invocation'

function toNumber (value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

function normalizeRate (value) {
  const num = toNumber(value)
  if (num === undefined) return undefined
  if (num > 0 && num <= 1) {
    return Number((num * 100).toFixed(2))
  }
  return Number(num.toFixed(2))
}

function mapQuotaRow (partner, stats) {
  const source = stats || {}
  return {
    partnerId: partner.partnerId,
    partnerName: partner.partnerName,
    status: partner.status,
    capabilityCount: Array.isArray(partner.capabilities) ? partner.capabilities.length : 0,
    rateLimitQps: source.rateLimitQps !== undefined ? source.rateLimitQps : partner.rateLimitQps,
    dailyQuota: source.dailyQuota,
    remainingQuota: source.remainingQuota,
    todayInvocations: source.todayInvocations !== undefined ? source.todayInvocations : source.totalInvocations,
    successRate: normalizeRate(source.successRate),
    throttledCount: source.throttledCount !== undefined ? source.throttledCount : source.rateLimitHitCount
  }
}

export function listPartnerQuotaStats (params = {}) {
  const page = params.page || params.pageNo || 1
  const size = params.size || params.pageSize || 10
  return listPartners({ page, size }).then(async data => {
    const items = (data && data.items) || []
    const rows = await Promise.all(items.map(async partner => {
      if (!partner || !partner.partnerId) {
        return mapQuotaRow(partner || {}, {})
      }
      const stats = await getPartnerStats(partner.partnerId).catch(() => ({}))
      return mapQuotaRow(partner, stats)
    }))
    return {
      items: rows,
      page: (data && data.page) || page,
      size,
      total: data && data.total !== undefined ? data.total : rows.length
    }
  })
}

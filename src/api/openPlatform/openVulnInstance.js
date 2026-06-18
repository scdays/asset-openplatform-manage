import openApiRequest from '@/utils/openApiRequest'

const PREFIX = '/internal/admin/open-vuln-instances'

/** 运营页查询 open_vuln_instance（mock / task-center 通用） */
export function listOpsVulnInstances (partnerId, options = {}) {
  const params = { partnerId, limit: options.limit || 200 }
  if (options.taskId) params.taskId = options.taskId
  if (options.vulInfoStat != null && options.vulInfoStat !== '') {
    params.vulInfoStat = options.vulInfoStat
  }
  return openApiRequest.get(PREFIX, { params })
}

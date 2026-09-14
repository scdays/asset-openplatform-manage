import platformAdminRequest from '@/utils/platformAdminRequest'

/**
 * 查询投递记录（platform-admin 控制面，仅投递元数据）。
 */
export function listPushRecords (params = {}) {
  return platformAdminRequest.get('/internal/admin/push-records', { params })
}

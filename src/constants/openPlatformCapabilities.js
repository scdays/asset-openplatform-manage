/**
 * @deprecated 请改用 @/constants/openPlatformDisplay
 * 保留本文件以兼容旧 import。
 */
import {
  CAPABILITIES,
  PARTNER_STATUSES,
  PARTNER_TYPES,
  capabilityLabel
} from '@/constants/openPlatformDisplay'

export const OPEN_PLATFORM_CAPABILITIES = CAPABILITIES.map(item => ({
  code: item.value,
  label: item.label
}))

export { PARTNER_TYPES, PARTNER_STATUSES, capabilityLabel }

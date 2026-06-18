import { clearPartnerSession } from '@/utils/openPartnerRequest'
import { clearPartnerSessionStorage } from '@/utils/partnerSessionStorage'

const E2E_TOKEN_KEY = 'openplatform.e2eTokenRecords'
const SOC_TASK_KEY = 'openplatform.socLastTask'

export function clearSocTaskSession () {
  try {
    sessionStorage.removeItem(SOC_TASK_KEY)
  } catch (e) {
    // ignore
  }
}

export function clearE2eTokenRecords () {
  try {
    sessionStorage.removeItem(E2E_TOKEN_KEY)
  } catch (e) {
    // ignore
  }
}

export function loadE2eTokenRecords () {
  try {
    const raw = sessionStorage.getItem(E2E_TOKEN_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

export function saveE2eTokenRecords (records) {
  try {
    if (!records || !records.length) {
      sessionStorage.removeItem(E2E_TOKEN_KEY)
      return
    }
    sessionStorage.setItem(E2E_TOKEN_KEY, JSON.stringify(records))
  } catch (e) {
    // ignore
  }
}

/** 清除联调相关浏览器缓存（接入方 Token、E2E 记录、SOC 任务记忆） */
export function clearAllOpenPlatformSessions () {
  clearPartnerSession()
  clearPartnerSessionStorage()
  clearSocTaskSession()
  clearE2eTokenRecords()
}

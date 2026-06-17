const STORAGE_KEY = 'openplatform.socLastTask'

export function saveSocTaskSession (task) {
  if (!task || !task.taskId) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      taskId: task.taskId,
      extTaskId: task.extTaskId || null,
      partnerId: task.partnerId || null,
      jobId: task.jobId || null,
      savedAt: new Date().toISOString()
    }))
  } catch (e) {
    // ignore quota / private mode
  }
}

export function loadSocTaskSession () {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.taskId) return null
    return parsed
  } catch (e) {
    return null
  }
}

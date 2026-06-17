const STORAGE_KEY = 'openplatform.partnerSession'

export function loadPartnerSessionFromStorage () {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.partnerId || !parsed.accessToken) return null
    return parsed
  } catch (e) {
    return null
  }
}

export function savePartnerSessionToStorage (session) {
  if (!session || !session.partnerId || !session.accessToken) return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    partnerId: session.partnerId,
    accessToken: session.accessToken,
    clientId: session.clientId || null,
    savedAt: new Date().toISOString()
  }))
}

export function clearPartnerSessionStorage () {
  sessionStorage.removeItem(STORAGE_KEY)
}

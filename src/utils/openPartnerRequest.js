import axios from 'axios'
import { notification } from 'ant-design-vue'
import resolveOpenPartnerGatewayBaseURL from '@/utils/resolveOpenPartnerGatewayBaseURL'

let sessionToken = null
let sessionPartnerId = null

export function setPartnerSession (accessToken, partnerId) {
  sessionToken = accessToken || null
  sessionPartnerId = partnerId || null
}

export function clearPartnerSession () {
  sessionToken = null
  sessionPartnerId = null
}

export function getPartnerSession () {
  return { accessToken: sessionToken, partnerId: sessionPartnerId }
}

/**
 * ?????? Open API???? partner-gateway??35770????Bearer ?????
 * ?? openApiRequest???????? /open-api-service?????????????????????
 */
const openPartnerRequest = axios.create({
  timeout: 120000
})

openPartnerRequest.interceptors.request.use(config => {
  if (!config.baseURL) {
    config.baseURL = resolveOpenPartnerGatewayBaseURL()
  }
  if (sessionToken) {
    config.headers.Authorization = `Bearer ${sessionToken}`
  }
  if (sessionPartnerId) {
    config.headers['X-Partner-Id'] = sessionPartnerId
  }
  if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && config.headers.common) {
      delete config.headers.common['Content-Type']
    }
    if (config.headers) {
      delete config.headers['Content-Type']
    }
  }

  // #region agent log
  const base = config.baseURL || ''
  const path = config.url || ''
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : ''
  const fullUrl = base ? (base.replace(/\/$/, '') + path) : (origin + path)
  fetch('http://127.0.0.1:7874/ingest/023b9c15-9f3a-4c05-9179-99ba833b20c8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '9a4f66' }, body: JSON.stringify({ sessionId: '9a4f66', runId: 'cors-fix', hypothesisId: 'H-CORS', location: 'openPartnerRequest.js', message: 'partner token/api request', data: { baseURL: base || '(same-origin)', path, fullUrl, crossOrigin: !!base }, timestamp: Date.now() }) }).catch(() => {})
  // #endregion

  return config
})

openPartnerRequest.interceptors.response.use(
  response => {
    const config = response.config || {}
    if (config.responseType === 'blob') {
      return response
    }
    const res = response.data
    const silent = config.silent
    if (res == null || typeof res.code === 'undefined') {
      return res
    }
    if (res.code !== 0) {
      if (!silent) {
        notification.error({
          message: 'Open API ???????',
          description: res.message || `?????? ${res.code}`
        })
      }
      const err = new Error(res.message || 'Error')
      err.code = res.code
      err.responseData = res
      return Promise.reject(err)
    }
    return res.data
  },
  error => {
    const silent = error && error.config && error.config.silent
    const body = error.response && error.response.data
    const msg = (body && body.message) || error.message
    if (!silent) {
      notification.error({
        message: 'Open API ???????',
        description: msg
      })
    }
    return Promise.reject(error)
  }
)

export default openPartnerRequest

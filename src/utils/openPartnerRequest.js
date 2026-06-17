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
 * 第三方 Open API 请求（经 partner-gateway 35770），携带 Bearer 与 X-Partner-Id。
 * 与 openApiRequest 分离：后者走平台网关 /open-api-service 管理内网接口。
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
          message: 'Open API 业务失败',
          description: res.message || `错误码 ${res.code}`
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
        message: 'Open API 请求失败',
        description: msg
      })
    }
    return Promise.reject(error)
  }
)

export default openPartnerRequest

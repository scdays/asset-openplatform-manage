import axios from 'axios'
import { notification } from 'ant-design-vue'
import storage from 'store'
import store from '@/store'
import resolvePlatformAdminBaseURL from '@/utils/resolvePlatformAdminBaseURL'
import { getOpenApiAdminKey, hasOpenApiAdminKey } from '@/utils/openPlatformRuntime'
import { ACCESS_TOKEN } from '@/store/mutation-types'

/**
 * platform-admin 控制面请求实例。
 * <p>baseURL=/platform-admin，经平台网关 morningglory 服务发现路由到 platform-admin 服务。
 * <p>仅用于漏洞管理平台内部管理/查看接口（/internal/admin/**）；与 openApiRequest 的区别仅 baseURL。
 * <p>鉴权：经 morningglory 须带平台 JWT；platform-admin 须带 X-Internal-Admin-Key。
 */
function resolveGatewayJwt () {
  let token = store.getters.token
  const parent = store.state.user && store.state.user.pStore
  if (!token && parent && parent.getters) {
    token = parent.getters.token
  }
  if (!token) {
    token = storage.get(ACCESS_TOKEN)
  }
  if (!token) {
    return ''
  }
  return 'JWT ' + String(token).replace(/^JWT\s+/i, '').trim()
}

const platformAdminRequest = axios.create({
  timeout: 60000
})

platformAdminRequest.interceptors.request.use(config => {
  if (!config.baseURL) {
    config.baseURL = resolvePlatformAdminBaseURL()
  }
  const jwt = resolveGatewayJwt()
  if (jwt) {
    config.headers.Authorization = jwt
  }
  const adminKey = getOpenApiAdminKey()
  if (adminKey) {
    config.headers['X-Internal-Admin-Key'] = adminKey
  }
  // multipart 须由浏览器自动带 boundary，勿沿用 axios 默认 application/json
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

platformAdminRequest.interceptors.response.use(
  response => {
    const config = response.config || {}
    if (config.responseType === 'blob') {
      const headers = response.headers || {}
      const contentType = headers['content-type'] || headers['Content-Type'] || ''
      const disposition = headers['content-disposition'] || headers['Content-Disposition'] || ''
      const isAttachment = /attachment/i.test(disposition)
      if (isAttachment) {
        return response
      }
      if (contentType.indexOf('application/json') >= 0 && response.data instanceof Blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const res = JSON.parse(reader.result)
              const silent = config.silent
              if (res != null && typeof res.code === 'number' && res.code !== 0) {
                if (!silent) {
                  notification.error({
                    message: '请求失败',
                    description: res.message || `错误码 ${res.code}`
                  })
                }
                reject(new Error(res.message || 'Error'))
              } else {
                resolve(response)
              }
            } catch (e) {
              resolve(response)
            }
          }
          reader.onerror = () => resolve(response)
          reader.readAsText(response.data)
        })
      }
      return response
    }
    const res = response.data
    const silent = response && response.config && response.config.silent
    if (res == null || typeof res.code === 'undefined') {
      return res
    }
    if (res.code !== 0) {
      if (!silent) {
        notification.error({
          message: '请求失败',
          description: res.message || `错误码 ${res.code}`
        })
      }
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res.data
  },
  error => {
    const silent = error && error.config && error.config.silent
    const msg = (error.response && error.response.data && error.response.data.message) || error.message
    if (!silent) {
      notification.error({
        message: '网络错误',
        description: msg
      })
    }
    return Promise.reject(error)
  }
)

export default platformAdminRequest

export function hasAdminKey () {
  return hasOpenApiAdminKey()
}

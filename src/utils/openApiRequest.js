import axios from 'axios'
import { notification } from 'ant-design-vue'

function resolveBaseURL () {
  const baseURL = process.env.VUE_APP_OPEN_API_BASE_URL
  if (window.__POWERED_BY_QIANKUN__ && baseURL && baseURL.indexOf('/') === 0) {
    const publicPath = (window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ || '').replace(/\/$/, '')
    return `${publicPath}${baseURL}`
  }
  return baseURL
}

const openApiRequest = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 60000
})

openApiRequest.interceptors.request.use(config => {
  const adminKey = process.env.VUE_APP_OPEN_API_ADMIN_KEY
  if (adminKey) {
    config.headers['X-Internal-Admin-Key'] = adminKey
  }
  return config
})

openApiRequest.interceptors.response.use(
  response => {
    const config = response.config || {}
    if (config.responseType === 'blob') {
      const contentType = (response.headers && response.headers['content-type']) || ''
      if (contentType.indexOf('application/json') >= 0 && response.data instanceof Blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const res = JSON.parse(reader.result)
              const silent = config.silent
              if (res.code !== 0) {
                if (!silent) {
                  notification.error({
                    message: '请求失败',
                    description: res.message || `错误码 ${res.code}`
                  })
                }
                reject(new Error(res.message || 'Error'))
              } else {
                resolve(res.data)
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

export default openApiRequest

export function hasAdminKey () {
  return !!process.env.VUE_APP_OPEN_API_ADMIN_KEY
}

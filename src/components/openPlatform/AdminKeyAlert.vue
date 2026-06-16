<template>
  <a-alert
    v-if="!hasKey"
    type="error"
    show-icon
    banner
    class="admin-key-alert"
  >
    <template slot="message">
      <strong>未配置 Admin Key</strong>
    </template>
    <template slot="description">
      开发环境：在 <code>.env.development.local</code> 设置
      <code>VUE_APP_OPEN_API_ADMIN_KEY</code>（与 open-api-service 的
      <code>open-api.admin.api-key</code> 一致）。
      生产环境：在 <code>window.conf</code> 配置
      <code>VUE_APP_OPEN_API_BASE_URL=/open-api-service</code>（与网关服务名一致，同 <code>/vuln-model</code>）
      及 <code>VUE_APP_OPEN_API_ADMIN_KEY</code>。
      经网关访问时需已登录（自动携带 JWT）。
    </template>
  </a-alert>
</template>

<script>
import { hasAdminKey } from '@/utils/openApiRequest'

export default {
  name: 'AdminKeyAlert',
  computed: {
    hasKey () {
      return hasAdminKey()
    }
  }
}
</script>

<style scoped>
.admin-key-alert {
  margin-bottom: 16px;
}
</style>

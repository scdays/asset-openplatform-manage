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
      请设置环境变量 <code>VUE_APP_OPEN_API_ADMIN_KEY</code>，与 open-api-service 的
      <code>open-api.admin.api-key</code> 保持一致；并配置 <code>VUE_APP_OPEN_API_BASE_URL</code> 指向 open-api-service。
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

<template>
  <div id="open-platform-app">
    <admin-key-alert />
    <router-view />
  </div>
</template>

<script>
import AdminKeyAlert from '@/components/openPlatform/AdminKeyAlert'

export default {
  components: {
    AdminKeyAlert
  }
}
</script>

<style>
#open-platform-app {
  min-height: 100%;
  background: #f0f2f5;
}
</style>

<template>
  <a-modal
    :visible="visible"
    :title="modalTitle"
    :width="960"
    :footer="null"
    :destroy-on-close="true"
    @cancel="handleClose"
  >
    <a-spin :spinning="loading">
      <div v-if="payload" class="response-body-modal">
        <div class="meta-row">
          <span>大小：{{ formatBytes(payload.byteSize) }}</span>
          <a-tag v-if="payload.stored" color="blue">完整响应</a-tag>
          <a-tag v-else color="orange">摘要重建</a-tag>
        </div>
        <div class="toolbar">
          <a-button size="small" @click="copyBody">复制 JSON</a-button>
          <a-button size="small" @click="downloadBody">下载 TXT</a-button>
        </div>
        <pre class="code-block">{{ payload.bodyFormatted }}</pre>
        <invocation-enum-hints :json-text="payload.bodyFormatted" />
      </div>
      <a-empty v-else-if="!loading" description="暂无响应报文" />
    </a-spin>
  </a-modal>
</template>

<script>
import { getInvocationResponseBody } from '@/api/openPlatform/invocation'
import InvocationEnumHints from '@/components/openPlatform/InvocationEnumHints'

export default {
  name: 'InvocationResponseBodyModal',
  components: { InvocationEnumHints },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    invocationId: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      loading: false,
      payload: null
    }
  },
  computed: {
    modalTitle () {
      return this.invocationId ? `Response Body · ${this.invocationId}` : 'Response Body'
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.loadBody()
      } else {
        this.payload = null
      }
    },
    invocationId () {
      if (this.visible) {
        this.loadBody()
      }
    }
  },
  methods: {
    loadBody () {
      if (!this.invocationId) {
        this.payload = null
        return
      }
      this.loading = true
      getInvocationResponseBody(this.invocationId).then(data => {
        this.payload = data || null
      }).catch(err => {
        this.payload = null
        this.$message.error((err && err.message) || '加载响应报文失败')
      }).finally(() => {
        this.loading = false
      })
    },
    handleClose () {
      this.$emit('close')
    },
    copyBody () {
      const text = this.payload && this.payload.bodyFormatted
      if (!text) {
        this.$message.warning('暂无可复制内容')
        return
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success('响应 JSON 已复制')
        }).catch(() => this.fallbackCopy(text))
      } else {
        this.fallbackCopy(text)
      }
    },
    fallbackCopy (text) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        this.$message.success('响应 JSON 已复制')
      } catch (e) {
        this.$message.error('复制失败')
      }
      document.body.removeChild(ta)
    },
    downloadBody () {
      const text = this.payload && this.payload.bodyFormatted
      if (!text) {
        this.$message.warning('暂无可下载内容')
        return
      }
      const filename = `${this.invocationId || 'response'}-response.txt`
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      this.$message.success('已开始下载')
    },
    formatBytes (size) {
      if (size === undefined || size === null || size === '') {
        return '-'
      }
      const num = Number(size)
      if (Number.isNaN(num) || num <= 0) {
        return '-'
      }
      if (num < 1024) {
        return `${num} B`
      }
      if (num < 1024 * 1024) {
        return `${(num / 1024).toFixed(1)} KB`
      }
      return `${(num / 1024 / 1024).toFixed(2)} MB`
    }
  }
}
</script>

<style scoped>
.response-body-modal {
  min-height: 120px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.code-block {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  padding: 12px;
  border-radius: 2px;
  font-size: 12px;
  overflow: auto;
  max-height: 60vh;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>

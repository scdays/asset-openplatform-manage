<template>
  <a-modal
    :visible="visible"
    title="生成接入凭证"
    :confirm-loading="loading"
    ok-text="确认生成"
    cancel-text="取消"
    :mask-closable="false"
    width="640px"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <p class="helper-text">clientSecret 仅在生成后展示一次，请立即复制保存。</p>
    <div v-if="!created" class="confirm-body">
      确认为合作方 <strong>{{ partnerId }}</strong> 生成新的 OAuth 客户端凭证？
    </div>
    <div v-else class="secret-box">
      <div class="secret-row">
        <span class="label">clientId</span>
        <code>{{ result.clientId }}</code>
        <a-button size="small" @click="copyText(result.clientId)">复制</a-button>
      </div>
      <div class="secret-row">
        <span class="label">clientSecret</span>
        <code>{{ result.clientSecret }}</code>
        <a-button size="small" type="primary" @click="copyText(result.clientSecret)">复制</a-button>
      </div>
      <div class="secret-row">
        <span class="label">状态</span>
        <a-tag color="green">{{ result.status }}</a-tag>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { createCredential } from '@/api/partner'

export default {
  name: 'CredentialCreateModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    partnerId: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      loading: false,
      created: false,
      result: {}
    }
  },
  watch: {
    visible (val) {
      if (!val) {
        this.reset()
      }
    }
  },
  methods: {
    reset () {
      this.loading = false
      this.created = false
      this.result = {}
    },
    handleCancel () {
      this.$emit('close')
      if (this.created) {
        this.$emit('created')
      }
    },
    handleOk () {
      if (this.created) {
        this.handleCancel()
        return
      }
      this.loading = true
      createCredential(this.partnerId)
        .then(data => {
          this.result = data || {}
          this.created = true
          this.$message.success('凭证已生成')
        })
        .finally(() => {
          this.loading = false
        })
    },
    copyText (text) {
      if (!text) return
      const input = document.createElement('textarea')
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      this.$message.success('已复制到剪贴板')
    }
  }
}
</script>

<style scoped>
.helper-text {
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 12px;
}
.secret-box {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  padding: 14px;
  border-radius: 2px;
}
.secret-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.secret-row .label {
  width: 100px;
  color: rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}
.secret-row code {
  flex: 1;
  word-break: break-all;
  background: #f5f5f5;
  padding: 4px 8px;
}
</style>

<template>
  <a-modal
    :visible="visible"
    :title="modalTitle"
    :width="640"
    :mask-closable="!created"
    :closable="true"
    :footer="null"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div v-if="!created" class="confirm-stage">
      <a-alert
        type="warning"
        show-icon
        message="webhookSecret 仅在生成后展示一次"
        description="轮换后旧 Secret 立即失效，请立即复制并交付第三方用于 HMAC-SHA256 验签。"
        style="margin-bottom: 16px;"
      />
      <p class="confirm-text">
        确认为合作方 <strong>{{ partnerId }}</strong> {{ prefill ? '展示' : '轮换' }} Webhook Secret？
      </p>
      <div class="modal-footer-actions">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="loading" @click="handleConfirm">
          {{ prefill ? '查看 Secret' : '确认轮换' }}
        </a-button>
      </div>
    </div>

    <div v-else class="result-stage">
      <a-alert
        type="error"
        show-icon
        message="请立即交付第三方"
        description="webhookSecret 仅本次展示。验签：HMAC-SHA256(请求体 UTF-8 字节)，hex 小写，请求头 X-Webhook-Signature、X-Webhook-Timestamp。"
        style="margin-bottom: 16px;"
      />

      <div class="secret-box">
        <div class="secret-row">
          <span class="label">partnerId</span>
          <code class="secret-value">{{ result.partnerId || partnerId }}</code>
        </div>
        <div class="secret-row">
          <span class="label">webhookSecret</span>
          <code class="secret-value">{{ result.webhookSecret }}</code>
          <a-button size="small" type="primary" @click="copyText(result.webhookSecret, 'webhookSecret')">复制</a-button>
        </div>
      </div>

      <div class="modal-footer-actions result-footer">
        <a-button type="primary" @click="handleSavedClose">我已保存，关闭</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { rotateWebhookSecret } from '@/api/partner'

export default {
  name: 'WebhookSecretRotateModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    partnerId: {
      type: String,
      default: ''
    },
    prefill: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      loading: false,
      created: false,
      result: {}
    }
  },
  computed: {
    modalTitle () {
      if (this.created) {
        return 'Webhook Secret（仅本次展示）'
      }
      return this.prefill ? '查看 Webhook Secret' : '轮换 Webhook Secret'
    }
  },
  watch: {
    visible (val) {
      if (!val) {
        this.reset()
        return
      }
      if (this.prefill && this.prefill.webhookSecret) {
        this.result = {
          partnerId: this.prefill.partnerId || this.partnerId,
          webhookSecret: this.prefill.webhookSecret
        }
        this.created = true
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
      if (this.created) {
        this.handleSavedClose()
        return
      }
      this.$emit('close')
    },
    handleSavedClose () {
      this.$emit('close')
      this.$emit('rotated')
    },
    handleConfirm () {
      if (this.prefill && this.prefill.webhookSecret) {
        this.result = {
          partnerId: this.prefill.partnerId || this.partnerId,
          webhookSecret: this.prefill.webhookSecret
        }
        this.created = true
        return
      }
      if (!this.partnerId) {
        this.$message.error('partnerId 不能为空')
        return
      }
      this.loading = true
      rotateWebhookSecret(this.partnerId)
        .then(data => {
          this.result = data || {}
          this.created = true
          this.$message.success('Webhook Secret 已轮换')
        })
        .catch(err => {
          this.$message.error((err && err.message) || '轮换失败')
        })
        .finally(() => {
          this.loading = false
        })
    },
    copyText (text, label) {
      if (!text) {
        this.$message.warning('暂无内容可复制')
        return
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success(label + ' 已复制')
        }).catch(() => this.fallbackCopy(text, label))
      } else {
        this.fallbackCopy(text, label)
      }
    },
    fallbackCopy (text, label) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        this.$message.success(label + ' 已复制')
      } catch (e) {
        this.$message.error('复制失败')
      }
      document.body.removeChild(ta)
    }
  }
}
</script>

<style scoped>
.confirm-text {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.7;
}

.secret-box {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  padding: 14px;
  border-radius: 2px;
}

.secret-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.secret-row:last-child {
  margin-bottom: 0;
}

.secret-row .label {
  width: 110px;
  color: rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
  line-height: 32px;
}

.secret-value {
  flex: 1;
  word-break: break-all;
  background: #f5f5f5;
  padding: 6px 8px;
  border-radius: 2px;
  min-height: 32px;
}

.modal-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.result-footer {
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
</style>

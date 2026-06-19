<template>
  <a-modal
    :visible="visible"
    :title="modalTitle"
    :width="720"
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
        message="clientSecret 仅在生成后展示一次"
        description="请立即复制并交付第三方，关闭弹窗后平台无法再次查看 secret。"
        style="margin-bottom: 16px;"
      />
      <p class="confirm-text">
        确认为合作方 <strong>{{ partnerId }}</strong> 生成新的 OAuth 客户端凭证？
      </p>
      <div class="modal-footer-actions">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="loading" @click="handleGenerate">确认生成</a-button>
      </div>
    </div>

    <div v-else class="result-stage">
      <a-alert
        type="error"
        show-icon
        message="请立即交付第三方"
        description="clientSecret 仅本次展示，属于平台安全策略，关闭后无法再次查看。"
        style="margin-bottom: 16px;"
      />

      <div class="secret-box">
        <div class="secret-row">
          <span class="label">clientId</span>
          <code class="secret-value">{{ result.clientId }}</code>
          <a-button size="small" @click="copyText(result.clientId, 'clientId')">复制</a-button>
        </div>
        <div class="secret-row">
          <span class="label">clientSecret</span>
          <code class="secret-value">{{ result.clientSecret }}</code>
          <a-button size="small" type="primary" @click="copyText(result.clientSecret, 'clientSecret')">复制</a-button>
        </div>
      </div>

      <div class="bundle-actions">
        <a-button type="primary" @click="copyAccessBundle">复制完整接入包（JSON）</a-button>
        <a-button @click="copyTokenCurl">复制 Token curl</a-button>
      </div>

      <p class="helper-line">
        Token: POST {{ tokenUrlLabel }} · API: {{ apiBaseLabel }} · grantType: client_credentials
      </p>

      <delivery-guide-panel
        :client-id="result.clientId"
        :client-secret="result.clientSecret"
        :mask-secret="false"
      />

      <div class="modal-footer-actions result-footer">
        <a-button type="primary" @click="handleSavedClose">我已保存，关闭</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { createCredential } from '@/api/partner'
import DeliveryGuidePanel from './DeliveryGuidePanel'
import {
  buildPartnerAccessBundle,
  buildPartnerTokenCurl,
  getPartnerApiBaseUrl,
  getPartnerTokenUrl
} from '@/utils/partnerAccess'

export default {
  name: 'CredentialCreateModal',
  components: { DeliveryGuidePanel },
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
  computed: {
    modalTitle () {
      if (this.created) {
        return '凭证已生成（clientSecret 仅本次展示）'
      }
      return '生成接入凭证'
    },
    tokenUrlLabel () {
      return getPartnerTokenUrl()
    },
    apiBaseLabel () {
      return getPartnerApiBaseUrl()
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
      if (this.created) {
        this.handleSavedClose()
        return
      }
      this.$emit('close')
    },
    handleSavedClose () {
      this.$emit('close')
      this.$emit('created')
    },
    handleGenerate () {
      if (!this.partnerId) {
        this.$message.error('partnerId 不能为空')
        return
      }
      this.loading = true
      createCredential(this.partnerId)
        .then(data => {
          this.result = data || {}
          this.created = true
          this.$message.success('凭证已生成')
        })
        .catch(err => {
          this.$message.error((err && err.message) || '生成凭证失败')
        })
        .finally(() => {
          this.loading = false
        })
    },
    copyAccessBundle () {
      const bundle = buildPartnerAccessBundle(this.result.clientId, this.result.clientSecret)
      this.copyText(JSON.stringify(bundle, null, 2), '接入包 JSON')
    },
    copyTokenCurl () {
      this.copyText(
        buildPartnerTokenCurl(this.result.clientId, this.result.clientSecret),
        'Token curl'
      )
    },
    copyText (text, label) {
      if (!text) {
        this.$message.warning('暂无内容可复制')
        return
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success(`${label} 已复制`)
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
        this.$message.success(`${label} 已复制`)
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
  width: 100px;
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

.bundle-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.helper-line {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin: 0 0 12px;
  word-break: break-all;
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

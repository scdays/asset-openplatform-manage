<template>
  <a-card :bordered="bordered" class="partner-session-panel">
    <template slot="title">
      <span>接入方会话</span>
      <a-tag v-if="sessionReady" color="green" style="margin-left: 8px;">已绑定</a-tag>
      <a-tag v-else color="orange" style="margin-left: 8px;">未绑定</a-tag>
    </template>
    <template slot="extra">
      <a v-if="form.partnerId" @click="goPartnerDetail">合作方详情</a>
      <a-divider v-if="form.partnerId && sessionReady" type="vertical" />
      <a v-if="sessionReady" @click="clearSession">清除会话</a>
    </template>

    <a-alert
      type="info"
      show-icon
      :message="hintTitle"
      :description="hintDesc"
      style="margin-bottom: 16px;"
    />

    <a-form layout="vertical" class="partner-session-form">
      <a-form-item label="接入方（合作伙伴已注册）" required>
        <a-select
          v-model="form.partnerId"
          show-search
          allow-clear
          placeholder="选择或搜索 partnerId"
          :filter-option="filterPartner"
          :loading="loadingPartners"
          @change="onPartnerChange"
        >
          <a-select-option
            v-for="p in partners"
            :key="p.partnerId"
            :value="p.partnerId"
          >
            {{ p.partnerId }} · {{ p.partnerName || '-' }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="鉴权方式">
        <a-radio-group v-model="authMode" @change="onAuthModeChange">
          <a-radio-button value="token">粘贴已有 Token</a-radio-button>
          <a-radio-button value="credential">clientId + Secret 换 Token</a-radio-button>
        </a-radio-group>
      </a-form-item>

      <template v-if="authMode === 'token'">
        <a-form-item label="Bearer accessToken" required>
          <a-textarea
            v-model="form.accessToken"
            :rows="2"
            placeholder="生产联调：使用接入方自行换取的 Token，或从交付记录中粘贴"
          />
        </a-form-item>
      </template>

      <template v-else>
        <a-form-item label="OAuth clientId" required>
          <a-select
            v-if="credentials.length"
            v-model="form.clientId"
            placeholder="选择凭证（来自合作方详情）"
            :loading="loadingCreds"
            :disabled="!form.partnerId"
            allow-clear
            show-search
            option-filter-prop="children"
          >
            <a-select-option
              v-for="c in credentials"
              :key="c.clientId"
              :value="c.clientId"
            >
              {{ c.clientId }}
              <span v-if="c.status"> · {{ c.status }}</span>
            </a-select-option>
          </a-select>
          <a-input
            v-else
            v-model="form.clientId"
            :disabled="!form.partnerId"
            placeholder="手动输入 clientId（合作方详情可见）"
          />
          <p v-if="form.partnerId && !loadingCreds && !credentials.length" class="credential-hint">
            <template v-if="!adminKeyReady">未配置 Admin Key，无法拉取凭证列表，请手动输入 clientId。</template>
            <template v-else>该接入方暂无凭证，请先到合作方详情创建凭证，或手动输入已有 clientId。</template>
            <a style="margin-left: 8px;" @click="reloadCredentials">刷新</a>
          </p>
        </a-form-item>
        <a-form-item label="clientSecret" required>
          <a-input-password
            v-model="form.clientSecret"
            placeholder="Secret 仅在创建凭证时展示一次；测试环境可粘贴已保存的 Secret"
          />
        </a-form-item>
      </template>

      <a-form-item :colon="false" class="partner-session-actions">
        <a-button type="primary" :loading="binding" @click="bindSession">
          {{ authMode === 'credential' ? '换取并绑定 Token' : '绑定会话' }}
        </a-button>
        <span v-if="sessionReady" class="session-brief">
          当前：<code>{{ boundPartnerId }}</code>
          <span class="token-mask">{{ tokenMask }}</span>
        </span>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script>
import { listPartners, listCredentials } from '@/api/partner'
import { bindPartnerAuth, fetchOAuthToken } from '@/api/openPlatform/openPartnerApi'
import { getPartnerSession } from '@/utils/openPartnerRequest'
import { clearAllOpenPlatformSessions } from '@/utils/openPlatformSession'
import { loadPartnerSessionFromStorage } from '@/utils/partnerSessionStorage'
import { normalizeListPayload } from '@/utils/openApiPayload'
import { hasOpenApiAdminKey } from '@/utils/openPlatformRuntime'

export default {
  name: 'PartnerSessionPanel',
  props: {
    bordered: { type: Boolean, default: false },
    initialPartnerId: { type: String, default: '' },
    hintTitle: {
      type: String,
      default: '模拟接入方调用 Open API'
    },
    hintDesc: {
      type: String,
      default: '选择已在「合作伙伴」注册的接入方，粘贴其 Token 或用凭证换取。会话在本浏览器标签内共享（处置测试、任务工作台等），清除会话将同时清空联调缓存。'
    }
  },
  data () {
    return {
      authMode: 'token',
      loadingPartners: false,
      loadingCreds: false,
      binding: false,
      partners: [],
      credentials: [],
      form: {
        partnerId: '',
        accessToken: '',
        clientId: '',
        clientSecret: ''
      },
      boundPartnerId: '',
      boundToken: ''
    }
  },
  computed: {
    sessionReady () {
      return !!(this.boundPartnerId && this.boundToken)
    },
    tokenMask () {
      if (!this.boundToken) return ''
      if (this.boundToken.length <= 12) return '***'
      return `${this.boundToken.slice(0, 6)}…${this.boundToken.slice(-4)}`
    },
    adminKeyReady () {
      return hasOpenApiAdminKey()
    }
  },
  async mounted () {
    this.hydrateFromSession()
    await this.loadPartners()
    const partnerId = this.initialPartnerId || this.form.partnerId
    if (partnerId) {
      this.form.partnerId = partnerId
      await this.loadCredentialsForPartner(partnerId)
    }
  },
  methods: {
    filterPartner (input, option) {
      const text = (option.componentOptions && option.componentOptions.children &&
        option.componentOptions.children[0] && option.componentOptions.children[0].text) || ''
      return text.toLowerCase().includes((input || '').toLowerCase())
    },
    hydrateFromSession () {
      const stored = loadPartnerSessionFromStorage()
      const s = getPartnerSession()
      if (s.partnerId) this.form.partnerId = s.partnerId
      if (stored && stored.clientId) this.form.clientId = stored.clientId
      if (s.accessToken) {
        this.form.accessToken = s.accessToken
        this.boundPartnerId = s.partnerId
        this.boundToken = s.accessToken
        this.$emit('bound', { partnerId: s.partnerId, accessToken: s.accessToken })
      }
    },
    async loadPartners () {
      this.loadingPartners = true
      try {
        const data = await listPartners({ page: 1, size: 200 })
        const items = (data && data.items) || (Array.isArray(data) ? data : [])
        this.partners = items
        if (this.form.partnerId && !this.partners.some(p => p.partnerId === this.form.partnerId)) {
          this.partners.unshift({
            partnerId: this.form.partnerId,
            partnerName: '（当前会话）'
          })
        }
      } catch (e) {
        this.$message.error('加载合作方列表失败')
      } finally {
        this.loadingPartners = false
      }
    },
    async onPartnerChange (partnerId) {
      this.form.clientId = ''
      this.credentials = []
      if (!partnerId) {
        this.$emit('partner-change', { partnerId: '' })
        return
      }
      this.$emit('partner-change', { partnerId })
      await this.loadCredentialsForPartner(partnerId)
    },
    async reloadCredentials () {
      if (!this.form.partnerId) return
      await this.loadCredentialsForPartner(this.form.partnerId)
    },
    async loadCredentialsForPartner (partnerId) {
      this.loadingCreds = true
      try {
        const data = await listCredentials(partnerId)
        this.credentials = normalizeListPayload(data)
        if (this.credentials.length === 1 && !this.form.clientId) {
          this.form.clientId = this.credentials[0].clientId
        } else if (!this.form.clientId && this.credentials.length > 1) {
          const active = this.credentials.find(c => c.status === 'ACTIVE')
          if (active) this.form.clientId = active.clientId
        }
        this.$emit('partner-change', {
          partnerId,
          clientId: this.form.clientId || undefined
        })
      } catch (e) {
        this.credentials = []
        this.$message.warning('加载凭证列表失败，可改用手动粘贴 Token 或手动输入 clientId')
      } finally {
        this.loadingCreds = false
      }
    },
    onAuthModeChange () {
      // keep partnerId
    },
    async bindSession () {
      if (!this.form.partnerId) {
        this.$message.warning('请选择接入方')
        return
      }
      this.binding = true
      try {
        let token = (this.form.accessToken || '').trim()
        let expiresIn
        if (this.authMode === 'credential') {
          if (!this.form.clientId || !this.form.clientSecret) {
            this.$message.warning('请填写 clientId 与 clientSecret')
            return
          }
          const tokenData = await fetchOAuthToken(this.form.clientId, this.form.clientSecret)
          token = tokenData.accessToken
          this.form.accessToken = token
          expiresIn = tokenData.expiresIn
        } else if (!token) {
          this.$message.warning('请粘贴 accessToken')
          return
        }
        bindPartnerAuth(token, this.form.partnerId, { clientId: this.form.clientId || undefined })
        this.boundPartnerId = this.form.partnerId
        this.boundToken = token
        this.$message.success('接入方会话已绑定')
        this.$emit('bound', {
          partnerId: this.form.partnerId,
          accessToken: token,
          clientId: this.form.clientId || undefined,
          clientSecret: this.authMode === 'credential' ? this.form.clientSecret : undefined,
          expiresIn,
          source: this.authMode === 'credential' ? 'credential' : 'paste'
        })
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.message) || e.message
        this.$message.error(msg || '绑定失败')
      } finally {
        this.binding = false
      }
    },
    clearSession () {
      clearAllOpenPlatformSessions()
      this.boundPartnerId = ''
      this.boundToken = ''
      this.form.accessToken = ''
      this.form.clientSecret = ''
      this.$message.info('已清除接入方会话与联调缓存')
      this.$emit('cleared')
    },
    goPartnerDetail () {
      if (!this.form.partnerId) return
      this.$router.push({ name: 'PartnerDetail', params: { partnerId: this.form.partnerId } })
    },
    /** 供父组件（分步联调）读取表单 */
    getFormState () {
      return {
        partnerId: this.form.partnerId,
        clientId: this.form.clientId,
        clientSecret: this.form.clientSecret,
        accessToken: (this.form.accessToken || '').trim(),
        authMode: this.authMode
      }
    },
    /** 供父组件校验 */
    ensureSession () {
      const s = getPartnerSession()
      if (!s.accessToken || !s.partnerId) {
        this.$message.warning('请先绑定接入方会话')
        return false
      }
      bindPartnerAuth(s.accessToken, s.partnerId)
      return true
    }
  }
}
</script>

<style scoped>
.partner-session-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.partner-session-actions {
  margin-bottom: 0;
}

.session-brief {
  margin-left: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
}

.session-brief code {
  background: #f5f5f5;
  padding: 0 4px;
  margin: 0 4px;
}

.token-mask {
  color: rgba(0, 0, 0, 0.45);
}

.credential-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}
</style>

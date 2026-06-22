<template>
  <div class="p_16 partner-detail-page">
    <a-breadcrumb>
      <a-breadcrumb-item><a @click.prevent="$router.push({ name: 'OpenPlatformOverview' })">控制台</a></a-breadcrumb-item>
      <a-breadcrumb-item><a @click.prevent="goList">合作伙伴</a></a-breadcrumb-item>
      <a-breadcrumb-item>{{ partner.partnerName || partnerId }}</a-breadcrumb-item>
    </a-breadcrumb>

    <a-spin :spinning="loading">
      <a-card style="margin-top: 16px;">
        <div class="detail-header">
          <div>
            <div class="detail-title">
              {{ partner.partnerName }}
              <enum-tag type="partnerStatus" :value="partner.status" />
            </div>
            <div class="detail-meta">
              partnerId: {{ partner.partnerId }} · {{ partnerTypeLabel }} · QPS {{ partner.rateLimitQps == null ? '不限' : partner.rateLimitQps }}
            </div>
          </div>
          <div class="detail-actions">
            <a-dropdown>
              <a-button>运营联调 <a-icon type="down" /></a-button>
              <a-menu slot="overlay">
                <a-menu-item @click="goVerifyFixOps">处置测试</a-menu-item>
              </a-menu>
            </a-dropdown>
            <a-button style="margin-left: 8px;" @click="goEdit">编辑</a-button>
            <a-button type="primary" style="margin-left: 8px;" @click="credentialVisible = true">生成凭证</a-button>
          </div>
        </div>

        <a-tabs v-model="activeTab">
          <a-tab-pane key="basic" tab="基本信息">
            <a-descriptions bordered :column="2" size="small">
              <a-descriptions-item label="partnerId">{{ partner.partnerId }}</a-descriptions-item>
              <a-descriptions-item label="partnerName">{{ partner.partnerName }}</a-descriptions-item>
              <a-descriptions-item label="接入方类型"><enum-tag type="partnerType" :value="partner.partnerType" /></a-descriptions-item>
              <a-descriptions-item label="状态"><enum-tag type="partnerStatus" :value="partner.status" /></a-descriptions-item>
              <a-descriptions-item label="rateLimitQps" :span="2">
                {{ partner.rateLimitQps == null ? '不限' : partner.rateLimitQps }}
              </a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>

          <a-tab-pane key="cap" tab="能力配置">
            <p class="field-helper">PUT 全量更新 capabilities（编辑页修改）</p>
            <capability-checkbox-group v-model="partner.capabilities" disabled />
            <a-button type="link" style="padding-left: 0; margin-top: 8px;" @click="goEdit">前往编辑</a-button>
          </a-tab-pane>

          <a-tab-pane key="cred" tab="接入凭证">
            <div class="table-operator table-operator-fixed">
              <span class="field-helper">secret 仅生成时展示一次</span>
              <a-button type="primary" @click="credentialVisible = true">生成凭证</a-button>
            </div>
            <a-table
              row-key="clientId"
              :columns="credentialColumns"
              :data-source="credentials"
              :loading="credLoading"
              :pagination="false"
              size="small"
            >
              <span slot="clientId" slot-scope="text"><code>{{ text }}</code></span>
              <span slot="status" slot-scope="text">
                <enum-tag type="credentialStatus" :value="text" />
              </span>
              <span slot="createdAt" slot-scope="text">{{ text | moment('YYYY-MM-DD HH:mm') }}</span>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="stats" tab="调用统计">
            <a-spin :spinning="statsLoading">
              <a-row :gutter="16" class="stats-cards">
                <a-col :xs="24" :sm="12" :xl="6">
                  <a-card size="small" class="stats-card" title="今日总调用">{{ formatStatNumber(partnerStats.todayTotal) }}</a-card>
                </a-col>
                <a-col :xs="24" :sm="12" :xl="6">
                  <a-card size="small" class="stats-card" title="今日成功">{{ formatStatNumber(partnerStats.todaySuccess) }}</a-card>
                </a-col>
                <a-col :xs="24" :sm="12" :xl="6">
                  <a-card size="small" class="stats-card" title="今日失败">{{ formatStatNumber(calcFailedCount(partnerStats)) }}</a-card>
                </a-col>
                <a-col :xs="24" :sm="12" :xl="6">
                  <a-card size="small" class="stats-card" title="今日成功率">{{ formatPercent(partnerStats.todaySuccessRate) }}</a-card>
                </a-col>
              </a-row>

              <a-table
                row-key="responseCode"
                :columns="errorCodeColumns"
                :data-source="partnerStats.topErrorCodes || []"
                :pagination="false"
                size="small"
                class="stats-table"
              >
                <span slot="responseCode" slot-scope="text">
                  <response-code-tag :value="text" />
                </span>
                <span slot="meaning" slot-scope="text, record">
                  {{ responseCodeLabel(record.responseCode) }}
                </span>
              </a-table>

              <a-table
                row-key="date"
                :columns="trendColumns"
                :data-source="partnerStats.dailyTrend || []"
                :pagination="false"
                size="small"
                class="stats-table"
              />

              <p class="field-helper" style="margin-top: 8px;">GET /internal/admin/partners/{partnerId}/stats</p>
            </a-spin>
          </a-tab-pane>

          <a-tab-pane key="webhook" tab="Webhook 日志">
            <a-spin :spinning="webhookLoading">
              <a-table
                row-key="id"
                :columns="webhookColumns"
                :data-source="webhookLogs"
                :pagination="false"
                size="small"
              >
                <span slot="status" slot-scope="text">
                  <enum-tag type="webhookDeliveryStatus" :value="text" />
                </span>
                <span slot="eventType" slot-scope="text">
                  <enum-tag type="webhookEventType" :value="text" />
                </span>
                <span slot="httpStatus" slot-scope="text">{{ formatHttpStatus(text) }}</span>
                <span slot="createdAt" slot-scope="text">{{ formatDateTime(text) }}</span>
              </a-table>
              <p class="field-helper" style="margin-top: 8px;">GET /internal/admin/webhook-deliveries?partnerId={partnerId}</p>
            </a-spin>
          </a-tab-pane>

          <a-tab-pane key="callback" tab="回调配置">
            <div class="table-operator table-operator-fixed" style="margin-bottom: 12px;">
              <span class="field-helper">webhookSecret 仅生成或轮换时展示一次，用于 HMAC-SHA256 验签</span>
              <a-button type="primary" @click="openWebhookSecretRotate">轮换 Webhook Secret</a-button>
            </div>
            <a-form-model :label-col="{ span: 4 }" :wrapper-col="{ span: 12 }">
              <a-form-model-item label="defaultCallbackUrl">
                <a-input :value="partner.defaultCallbackUrl" read-only />
              </a-form-model-item>
              <a-form-model-item label="webhookSecret">
                <a-tag :color="partner.webhookSecretConfigured ? 'green' : 'default'">
                  {{ partner.webhookSecretConfigured ? '已配置' : '未配置' }}
                </a-tag>
              </a-form-model-item>
            </a-form-model>
            <a-button type="link" style="padding-left: 0;" @click="goEdit">在编辑页修改回调地址</a-button>
            <p class="field-helper" style="margin-top: 8px;">POST /internal/admin/partners/{partnerId}/webhook-secret/rotate</p>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </a-spin>

    <credential-create-modal
      :visible="credentialVisible"
      :partner-id="partnerId"
      @close="credentialVisible = false"
      @created="loadCredentials"
    />

    <webhook-secret-rotate-modal
      :visible="webhookSecretVisible"
      :partner-id="partnerId"
      :prefill="webhookSecretPrefill"
      @close="closeWebhookSecretModal"
      @rotated="onWebhookSecretRotated"
    />
  </div>
</template>

<script>
import { getPartner, listCredentials } from '@/api/partner'
import { getPartnerStats, listWebhookDeliveries } from '@/api/openPlatform/invocation'
import CapabilityCheckboxGroup from './components/CapabilityCheckboxGroup'
import CredentialCreateModal from './components/CredentialCreateModal'
import WebhookSecretRotateModal from './components/WebhookSecretRotateModal'
import EnumTag from '@/components/openPlatform/EnumTag'
import ResponseCodeTag from '@/components/openPlatform/ResponseCodeTag'
import { labelOf, responseCodeLabel, formatHttpStatus } from '@/constants/openPlatformDisplay'

const credentialColumns = [
  { title: 'clientId', dataIndex: 'clientId', scopedSlots: { customRender: 'clientId' }, ellipsis: true },
  { title: 'credentialId', dataIndex: 'id', customRender: text => (text != null ? `cred-${text}` : '-') },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', scopedSlots: { customRender: 'createdAt' }, width: 170 }
]

const errorCodeColumns = [
  { title: '错误码', dataIndex: 'responseCode', scopedSlots: { customRender: 'responseCode' }, width: 180 },
  { title: '含义', scopedSlots: { customRender: 'meaning' }, width: 160 },
  { title: '次数', dataIndex: 'count', width: 120 }
]

const trendColumns = [
  { title: '日期', dataIndex: 'date', width: 160 },
  { title: '总调用', dataIndex: 'totalCount', width: 120 },
  { title: '成功调用', dataIndex: 'successCount', width: 120 },
  { title: '失败调用', dataIndex: 'failCount', width: 120 },
  { title: '成功率', dataIndex: 'successRate', customRender: value => `${(Number(value || 0) * 100).toFixed(2)}%` }
]

const webhookColumns = [
  { title: '事件类型', dataIndex: 'eventType', scopedSlots: { customRender: 'eventType' }, width: 180 },
  { title: 'callbackUrl', dataIndex: 'callbackUrl', ellipsis: true },
  { title: 'HTTP', dataIndex: 'httpStatus', scopedSlots: { customRender: 'httpStatus' }, width: 90 },
  { title: '投递次数', dataIndex: 'attemptCount', width: 88, customRender: text => (text == null || text <= 1 ? '1' : String(text)) },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 110 },
  { title: '创建时间', dataIndex: 'createdAt', scopedSlots: { customRender: 'createdAt' }, width: 180 }
]

export default {
  name: 'PartnerDetail',
  components: {
    CapabilityCheckboxGroup,
    CredentialCreateModal,
    WebhookSecretRotateModal,
    EnumTag,
    ResponseCodeTag
  },
  data () {
    return {
      partnerId: this.$route.params.partnerId,
      partner: {},
      credentials: [],
      partnerStats: {},
      webhookLogs: [],
      loading: false,
      credLoading: false,
      statsLoading: false,
      webhookLoading: false,
      activeTab: 'basic',
      credentialVisible: false,
      webhookSecretVisible: false,
      webhookSecretPrefill: null,
      credentialColumns,
      errorCodeColumns,
      trendColumns,
      webhookColumns
    }
  },
  computed: {
    partnerTypeLabel () {
      return labelOf('partnerType', this.partner.partnerType, this.partner.partnerType)
    }
  },
  created () {
    this.loadPartner()
    this.loadCredentials()
    this.tryOpenPendingWebhookSecret()
  },
  watch: {
    activeTab (value) {
      if (value === 'stats' && !this.statsLoading && !Object.keys(this.partnerStats || {}).length) {
        this.loadPartnerStats()
      }
      if (value === 'webhook' && !this.webhookLoading && !this.webhookLogs.length) {
        this.loadWebhookLogs()
      }
    }
  },
  methods: {
    loadPartner () {
      this.loading = true
      getPartner(this.partnerId)
        .then(data => {
          this.partner = data || {}
        })
        .finally(() => {
          this.loading = false
        })
    },
    loadCredentials () {
      this.credLoading = true
      listCredentials(this.partnerId)
        .then(data => {
          this.credentials = data || []
        })
        .finally(() => {
          this.credLoading = false
        })
    },
    loadPartnerStats () {
      this.statsLoading = true
      getPartnerStats(this.partnerId)
        .then(data => {
          this.partnerStats = data || {}
        })
        .catch(() => {
          this.partnerStats = {}
        })
        .finally(() => {
          this.statsLoading = false
        })
    },
    loadWebhookLogs () {
      this.webhookLoading = true
      listWebhookDeliveries({
        partnerId: this.partnerId,
        page: 1,
        size: 10
      })
        .then(data => {
          this.webhookLogs = (data && data.items) || []
        })
        .catch(() => {
          this.webhookLogs = []
        })
        .finally(() => {
          this.webhookLoading = false
        })
    },
    formatStatNumber (value) {
      return value === undefined || value === null || value === '' ? '-' : value
    },
    calcFailedCount (stats) {
      if (!stats) return '-'
      const total = Number(stats.todayTotal || 0)
      const success = Number(stats.todaySuccess || 0)
      return total - success
    },
    formatPercent (value) {
      if (value === undefined || value === null || value === '') return '-'
      const numberValue = Number(value)
      if (Number.isNaN(numberValue)) return '-'
      if (numberValue > 1) return `${numberValue.toFixed(2)}%`
      return `${(numberValue * 100).toFixed(2)}%`
    },
    responseCodeLabel,
    formatHttpStatus,
    formatDateTime (value) {
      if (!value) return '-'
      if (this.$moment) {
        return this.$moment(value).format('YYYY-MM-DD HH:mm:ss')
      }
      return value
    },
    goList () {
      this.$router.push({ name: 'PartnerList' })
    },
    goEdit () {
      this.$router.push({ name: 'PartnerEdit', params: { partnerId: this.partnerId } })
    },
    goVerifyFixOps () {
      this.$router.push({ name: 'VerifyFixOps', query: { partnerId: this.partnerId } })
    },
    openWebhookSecretRotate () {
      this.webhookSecretPrefill = null
      this.webhookSecretVisible = true
    },
    closeWebhookSecretModal () {
      this.webhookSecretVisible = false
      this.webhookSecretPrefill = null
    },
    onWebhookSecretRotated () {
      this.loadPartner()
    },
    tryOpenPendingWebhookSecret () {
      if (this.$route.query.showWebhookSecret !== '1') {
        return
      }
      const key = 'openplatform.pendingWebhookSecret.' + this.partnerId
      const raw = sessionStorage.getItem(key)
      if (!raw) {
        return
      }
      sessionStorage.removeItem(key)
      try {
        const payload = JSON.parse(raw)
        if (payload && payload.webhookSecret) {
          this.webhookSecretPrefill = payload
          this.webhookSecretVisible = true
          this.activeTab = 'callback'
        }
      } catch (e) {
        // ignore
      }
    }
  }
}
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-actions {
  display: flex;
  align-items: center;
}

.detail-title {
  font-size: 18px;
  font-weight: 500;
}
.detail-meta {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  margin-top: 4px;
}

.table-operator-fixed {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-helper {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
}

.partner-detail-page :deep(.ant-card-body) {
  padding: 20px;
}

.partner-detail-page :deep(.ant-descriptions-bordered .ant-descriptions-item-label) {
  background: #fafafa;
}

.stats-cards {
  margin-bottom: 12px;
}

.stats-card :deep(.ant-card-head) {
  min-height: 40px;
}

.stats-card :deep(.ant-card-head-title) {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.stats-card :deep(.ant-card-body) {
  font-size: 22px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  padding: 12px 16px;
}

.stats-table {
  margin-top: 8px;
}
</style>

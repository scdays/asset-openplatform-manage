<template>
  <div class="p_16 partner-detail-page">
    <a-breadcrumb>
      <a-breadcrumb-item><a @click.prevent="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a></a-breadcrumb-item>
      <a-breadcrumb-item><a @click.prevent="goList">合作方管理</a></a-breadcrumb-item>
      <a-breadcrumb-item>{{ partner.partnerName || partnerId }}</a-breadcrumb-item>
    </a-breadcrumb>

    <a-spin :spinning="loading">
      <a-card style="margin-top: 16px;">
        <div class="detail-header">
          <div>
            <div class="detail-title">
              {{ partner.partnerName }}
              <a-tag :color="partner.status === 'ACTIVE' ? 'green' : 'red'">{{ partner.status }}</a-tag>
            </div>
            <div class="detail-meta">
              partnerId: {{ partner.partnerId }} · {{ partner.partnerType }} · QPS {{ partner.rateLimitQps == null ? '不限' : partner.rateLimitQps }}
            </div>
          </div>
          <div class="detail-actions">
            <a-button @click="goEdit">编辑</a-button>
            <a-button type="primary" style="margin-left: 8px;" @click="credentialVisible = true">生成凭证</a-button>
          </div>
        </div>

        <a-tabs v-model="activeTab">
          <a-tab-pane key="basic" tab="基本信息">
            <a-descriptions bordered :column="2" size="small">
              <a-descriptions-item label="partnerId">{{ partner.partnerId }}</a-descriptions-item>
              <a-descriptions-item label="partnerName">{{ partner.partnerName }}</a-descriptions-item>
              <a-descriptions-item label="partnerType">{{ partner.partnerType }}</a-descriptions-item>
              <a-descriptions-item label="status">{{ partner.status }}</a-descriptions-item>
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
              <span slot="status" slot-scope="text">
                <a-tag :color="text === 'ACTIVE' ? 'green' : 'default'">{{ text }}</a-tag>
              </span>
              <span slot="createdAt" slot-scope="text">{{ text | moment('YYYY-MM-DD HH:mm') }}</span>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="callback" tab="回调配置">
            <a-form-model :label-col="{ span: 4 }" :wrapper-col="{ span: 12 }">
              <a-form-model-item label="defaultCallbackUrl">
                <a-input :value="partner.defaultCallbackUrl" read-only />
              </a-form-model-item>
            </a-form-model>
            <a-button type="link" style="padding-left: 0;" @click="goEdit">在编辑页修改回调地址</a-button>
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
  </div>
</template>

<script>
import { getPartner, listCredentials } from '@/api/partner'
import CapabilityCheckboxGroup from './components/CapabilityCheckboxGroup'
import CredentialCreateModal from './components/CredentialCreateModal'

const credentialColumns = [
  { title: 'clientId', dataIndex: 'clientId' },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' } },
  { title: '创建时间', dataIndex: 'createdAt', scopedSlots: { customRender: 'createdAt' } }
]

export default {
  name: 'PartnerDetail',
  components: {
    CapabilityCheckboxGroup,
    CredentialCreateModal
  },
  data () {
    return {
      partnerId: this.$route.params.partnerId,
      partner: {},
      credentials: [],
      loading: false,
      credLoading: false,
      activeTab: 'basic',
      credentialVisible: false,
      credentialColumns
    }
  },
  created () {
    this.loadPartner()
    this.loadCredentials()
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
    goList () {
      this.$router.push({ name: 'PartnerList' })
    },
    goEdit () {
      this.$router.push({ name: 'PartnerEdit', params: { partnerId: this.partnerId } })
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
</style>

<template>
  <div class="p_16 webhook-delivery-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>调用治理</a-breadcrumb-item>
      <a-breadcrumb-item>Webhook 投递日志</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" class="webhook-search-card">
      <a-form layout="vertical" class="webhook-search-form">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="partnerId">
              <a-input v-model="queryParam.partnerId" placeholder="请输入 partnerId" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="事件类型">
              <a-select v-model="queryParam.eventType" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in eventTypeFilterOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="投递状态">
              <a-select v-model="queryParam.status" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in statusFilterOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="5">
            <a-form-item label="关联 resourceId">
              <a-input v-model="queryParam.resourceId" placeholder="taskId / vulInfoID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :xl="4" class="webhook-search-actions-col">
            <a-form-item label=" " :colon="false" class="webhook-search-actions-item">
              <div class="webhook-search-actions">
                <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
                <a-button @click="resetQuery">重置</a-button>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card :bordered="false" class="webhook-table-card">
      <div class="webhook-toolbar">
        <span class="api-hint">GET /internal/admin/webhook-deliveries</span>
        <span class="toolbar-note">POST .../webhook-deliveries/{id}/retry</span>
      </div>
      <s-table
        ref="table"
        size="default"
        row-key="id"
        :columns="columns"
        :data="loadData"
        :alert="false"
        :pagination="pagination"
        show-pagination="auto"
      >
        <span slot="serial" slot-scope="text, record, index">{{ index + 1 }}</span>
        <span slot="eventType" slot-scope="text">
          <enum-tag type="webhookEventType" :value="text" />
        </span>
        <span slot="resource" slot-scope="text, record">
          <template v-if="record.resourceId">
            <enum-tag v-if="record.resourceType" type="domain" :value="record.resourceType" />
            <code>{{ record.resourceId }}</code>
          </template>
          <span v-else>-</span>
        </span>
        <span slot="status" slot-scope="text">
          <enum-tag type="webhookDeliveryStatus" :value="text" />
        </span>
        <span slot="httpStatus" slot-scope="text">
          <a-tag :color="httpStatusColor(text)">{{ formatHttpStatus(text) }}</a-tag>
        </span>
        <span slot="createdAt" slot-scope="text">{{ formatDateTime(text) }}</span>
        <span slot="nextRetryAt" slot-scope="text">{{ formatDateTime(text) }}</span>
        <span slot="action" slot-scope="text, record">
          <a @click="openDetail(record)">详情</a>
          <template v-if="canDownloadExport(record)">
            <a-divider type="vertical" />
            <a :class="{ 'is-downloading': downloadingId === record.id }" @click="handleDownloadExport(record)">下载外发</a>
          </template>
          <template v-if="record.resourceId">
            <a-divider type="vertical" />
            <a @click="goInvocations(record)">调用记录</a>
          </template>
          <template v-if="record.status === 'FAILED'">
            <a-divider type="vertical" />
            <a @click="quickRetry(record)">重试</a>
          </template>
        </span>
      </s-table>
    </a-card>

    <webhook-delivery-detail-drawer
      :visible="drawerVisible"
      :delivery-id="selectedDeliveryId"
      @close="drawerVisible = false"
      @retried="handleRetried"
    />
  </div>
</template>

<script>
import { STable } from '@/components'
import EnumTag from '@/components/openPlatform/EnumTag'
import { formatHttpStatus, httpStatusColor, labelOf, optionsOf } from '@/constants/openPlatformDisplay'
import { listWebhookDeliveries, retryWebhookDelivery } from '@/api/openPlatform/invocation'
import { resolveInvocationLinkQuery } from '@/utils/openPlatformLink'
import { canDownloadExportDelivery, triggerExportDownload } from '@/utils/webhookExport'
import WebhookDeliveryDetailDrawer from './components/WebhookDeliveryDetailDrawer'

const columns = [
  { title: '序号', scopedSlots: { customRender: 'serial' }, width: 60 },
  { title: 'deliveryId', dataIndex: 'id', width: 90 },
  { title: 'partnerId', dataIndex: 'partnerId', width: 140 },
  { title: '事件类型', dataIndex: 'eventType', scopedSlots: { customRender: 'eventType' }, width: 160 },
  { title: '关联资源', dataIndex: 'resourceId', scopedSlots: { customRender: 'resource' }, width: 180 },
  { title: 'callbackUrl', dataIndex: 'callbackUrl', ellipsis: true },
  { title: 'HTTP', dataIndex: 'httpStatus', scopedSlots: { customRender: 'httpStatus' }, width: 90 },
  { title: '重试次数', dataIndex: 'retryCount', width: 90 },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', scopedSlots: { customRender: 'createdAt' }, width: 170 },
  { title: '操作', scopedSlots: { customRender: 'action' }, width: 200, fixed: 'right' }
]

export default {
  name: 'WebhookDeliveryList',
  components: { STable, EnumTag, WebhookDeliveryDetailDrawer },
  data () {
    return {
      columns,
      statusFilterOptions: optionsOf('webhookDeliveryStatus', { includeAll: true }),
      eventTypeFilterOptions: optionsOf('webhookEventType', { includeAll: true }),
      queryParam: {
        partnerId: undefined,
        eventType: undefined,
        status: undefined,
        resourceId: undefined
      },
      drawerVisible: false,
      selectedDeliveryId: null,
      downloadingId: null,
      pagination: {
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: total => `共 ${total} 条`
      },
      loadData: parameter => {
        const page = parameter.pageNo || 1
        const size = parameter.pageSize || 10
        const params = Object.assign({}, this.queryParam, { page, size })
        return listWebhookDeliveries(params).then(data => {
          const items = (data && data.items) || []
          return {
            data: items,
            pageNo: (data && data.page) || page,
            totalCount: data ? data.total : items.length
          }
        })
      }
    }
  },
  mounted () {
    this.applyRouteQuery()
  },
  watch: {
    '$route.query': {
      handler () {
        this.applyRouteQuery()
      },
      deep: true
    }
  },
  methods: {
    applyRouteQuery () {
      const q = this.$route.query || {}
      let changed = false
      if (q.partnerId !== undefined && q.partnerId !== this.queryParam.partnerId) {
        this.queryParam.partnerId = q.partnerId || undefined
        changed = true
      }
      if (q.resourceId !== undefined && q.resourceId !== this.queryParam.resourceId) {
        this.queryParam.resourceId = q.resourceId || undefined
        changed = true
      }
      if (changed && this.$refs.table) {
        this.$refs.table.refresh(true)
      }
      if (q.deliveryId) {
        this.selectedDeliveryId = q.deliveryId
        this.drawerVisible = true
      }
    },
    resetQuery () {
      this.queryParam = {
        partnerId: undefined,
        eventType: undefined,
        status: undefined,
        resourceId: undefined
      }
      this.$refs.table.refresh(true)
    },
    goInvocations (record) {
      const link = resolveInvocationLinkQuery(record)
      if (!link) return
      this.$router.push({
        name: 'InvocationList',
        query: link
      })
    },
    canDownloadExport: canDownloadExportDelivery,
    handleDownloadExport (record) {
      if (!canDownloadExportDelivery(record) || this.downloadingId != null) return
      this.downloadingId = record.id
      triggerExportDownload(record).catch(err => {
        this.$message.error((err && err.message) || '下载外发文件失败')
      }).finally(() => {
        this.downloadingId = null
      })
    },
    openDetail (record) {
      if (!record || record.id == null) return
      this.selectedDeliveryId = record.id
      this.drawerVisible = true
    },
    quickRetry (record) {
      if (!record || record.id == null) return
      this.$confirm({
        title: '确认重试 Webhook 投递？',
        content: `将复用 deliveryId=${record.id} 的报文再次 POST 到 callbackUrl。`,
        onOk: () => {
          return retryWebhookDelivery(record.id).then(data => {
            const ok = data && data.status === 'SUCCESS'
            this.$message.success(ok ? '重试成功' : `重试完成 · ${labelOf('webhookDeliveryStatus', data && data.status)}`)
            this.$refs.table.refresh()
          })
        }
      })
    },
    handleRetried () {
      this.$refs.table.refresh()
    },
    formatHttpStatus,
    httpStatusColor,
    formatDateTime (value) {
      if (!value) return '-'
      return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value
    }
  }
}
</script>

<style scoped>
.webhook-search-card {
  margin: 16px 0;
}

.webhook-search-card :deep(.ant-card-body) {
  padding: 12px 16px 10px;
}

.webhook-table-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.webhook-search-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.webhook-search-form :deep(.ant-form-item-label) {
  line-height: 1;
  padding-bottom: 4px;
}

.webhook-search-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  height: auto;
}

.webhook-search-actions-col {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
}

.webhook-search-actions-item :deep(.ant-form-item-label) {
  visibility: hidden;
}

.webhook-search-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
}

.webhook-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
  flex-wrap: wrap;
}

.api-hint,
.toolbar-note {
  color: rgba(0, 0, 0, 0.55);
  font-size: 12px;
  font-family: Consolas, monospace;
}

.webhook-table-card code {
  color: rgba(0, 0, 0, 0.85);
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  padding: 0 4px;
  border-radius: 2px;
  font-size: 12px;
}

@media (max-width: 1199px) {
  .webhook-search-actions-col {
    justify-content: flex-start;
    margin-top: 8px;
  }

  .webhook-search-form :deep(.ant-form-item) {
    margin-bottom: 8px;
  }

  .webhook-search-actions-col :deep(.ant-form-item) {
    margin-bottom: 0;
  }
}
</style>

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
            <a-form-item label="eventType">
              <a-input v-model="queryParam.eventType" placeholder="例如 TASK_COMPLETED" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="投递状态">
              <a-select v-model="queryParam.status" placeholder="全部" allow-clear>
                <a-select-option value="">全部</a-select-option>
                <a-select-option value="SUCCESS">SUCCESS</a-select-option>
                <a-select-option value="FAILED">FAILED</a-select-option>
                <a-select-option value="PENDING">PENDING</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :xl="6" class="webhook-search-actions-col">
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
        <span slot="status" slot-scope="text">
          <a-tag :color="statusColor(text)">{{ text || '-' }}</a-tag>
        </span>
        <span slot="httpStatus" slot-scope="text">{{ text == null ? '-' : text }}</span>
        <span slot="createdAt" slot-scope="text">{{ formatDateTime(text) }}</span>
        <span slot="nextRetryAt" slot-scope="text">{{ formatDateTime(text) }}</span>
      </s-table>
    </a-card>
  </div>
</template>

<script>
import { STable } from '@/components'
import { listWebhookDeliveries } from '@/api/openPlatform/invocation'

const columns = [
  { title: '序号', scopedSlots: { customRender: 'serial' }, width: 60 },
  { title: 'partnerId', dataIndex: 'partnerId', width: 160 },
  { title: 'eventType', dataIndex: 'eventType', width: 180 },
  { title: 'callbackUrl', dataIndex: 'callbackUrl', ellipsis: true },
  { title: 'HTTP', dataIndex: 'httpStatus', scopedSlots: { customRender: 'httpStatus' }, width: 90 },
  { title: '重试次数', dataIndex: 'retryCount', width: 100 },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 110 },
  { title: '创建时间', dataIndex: 'createdAt', scopedSlots: { customRender: 'createdAt' }, width: 180 },
  { title: '下次重试', dataIndex: 'nextRetryAt', scopedSlots: { customRender: 'nextRetryAt' }, width: 180 }
]

export default {
  name: 'WebhookDeliveryList',
  components: { STable },
  data () {
    return {
      columns,
      queryParam: {
        partnerId: undefined,
        eventType: undefined,
        status: undefined
      },
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
  methods: {
    resetQuery () {
      this.queryParam = {
        partnerId: undefined,
        eventType: undefined,
        status: undefined
      }
      this.$refs.table.refresh(true)
    },
    statusColor (status) {
      if (status === 'SUCCESS') return 'green'
      if (status === 'FAILED') return 'red'
      if (status === 'PENDING') return 'orange'
      return 'default'
    },
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
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 10px;
}

.api-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  font-family: Consolas, monospace;
  line-height: 32px;
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

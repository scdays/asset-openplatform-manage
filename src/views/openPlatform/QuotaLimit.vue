<template>
  <div class="p_16 quota-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>配额与限流</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" class="quota-search-card">
      <a-form layout="vertical" class="quota-search-form">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="partnerId">
              <a-input v-model="queryParam.partnerId" placeholder="请输入 partnerId" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="状态">
              <a-select v-model="queryParam.status" placeholder="全部" allow-clear>
                <a-select-option value="">全部</a-select-option>
                <a-select-option value="ACTIVE">ACTIVE</a-select-option>
                <a-select-option value="DISABLED">DISABLED</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :xl="12" class="quota-search-actions-col">
            <a-form-item label=" " :colon="false" class="quota-search-actions-item">
              <div class="quota-search-actions">
                <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
                <a-button @click="resetQuery">重置</a-button>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card :bordered="false" class="quota-table-card">
      <div class="quota-toolbar">
        <span class="api-hint">GET /internal/admin/partners + /stats</span>
      </div>
      <s-table
        ref="table"
        size="default"
        row-key="partnerId"
        :columns="columns"
        :data="loadData"
        :alert="false"
        :pagination="pagination"
        show-pagination="auto"
      >
        <span slot="serial" slot-scope="text, record, index">{{ index + 1 }}</span>
        <span slot="partnerId" slot-scope="text">{{ text || '-' }}</span>
        <span slot="status" slot-scope="text">
          <a-tag :color="text === 'ACTIVE' ? 'green' : 'red'">{{ text || '-' }}</a-tag>
        </span>
        <span slot="rateLimitQps" slot-scope="text">{{ text == null ? '不限' : text }}</span>
        <span slot="dailyQuota" slot-scope="text">{{ text == null ? '-' : text }}</span>
        <span slot="remainingQuota" slot-scope="text">{{ text == null ? '-' : text }}</span>
        <span slot="todayInvocations" slot-scope="text">{{ text == null ? '-' : text }}</span>
        <span slot="successRate" slot-scope="text">{{ formatSuccessRate(text) }}</span>
        <span slot="throttledCount" slot-scope="text">
          <a-tag :color="text > 0 ? 'red' : 'green'">{{ text == null ? '-' : text }}</a-tag>
        </span>
      </s-table>
    </a-card>
  </div>
</template>

<script>
import { STable } from '@/components'
import { listPartnerQuotaStats } from '@/api/openPlatform/quota'

const columns = [
  { title: '序号', scopedSlots: { customRender: 'serial' }, width: 60 },
  { title: 'partnerId', dataIndex: 'partnerId', scopedSlots: { customRender: 'partnerId' }, width: 160 },
  { title: '名称', dataIndex: 'partnerName', ellipsis: true, width: 180 },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 100 },
  { title: '能力数', dataIndex: 'capabilityCount', width: 80 },
  { title: 'QPS', dataIndex: 'rateLimitQps', scopedSlots: { customRender: 'rateLimitQps' }, width: 80 },
  { title: '日配额', dataIndex: 'dailyQuota', scopedSlots: { customRender: 'dailyQuota' }, width: 100 },
  { title: '剩余配额', dataIndex: 'remainingQuota', scopedSlots: { customRender: 'remainingQuota' }, width: 100 },
  { title: '今日调用', dataIndex: 'todayInvocations', scopedSlots: { customRender: 'todayInvocations' }, width: 100 },
  { title: '成功率', dataIndex: 'successRate', scopedSlots: { customRender: 'successRate' }, width: 90 },
  { title: '限流触发', dataIndex: 'throttledCount', scopedSlots: { customRender: 'throttledCount' }, width: 100 }
]

export default {
  name: 'QuotaLimit',
  components: { STable },
  data () {
    return {
      columns,
      queryParam: {
        partnerId: undefined,
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
        return listPartnerQuotaStats({ page, size }).then(data => {
          let items = (data && data.items) || []
          items = this.filterClient(items)
          return {
            data: items,
            pageNo: (data && data.page) || page,
            totalCount: data && data.total !== undefined ? data.total : items.length
          }
        })
      }
    }
  },
  methods: {
    resetQuery () {
      this.queryParam = {
        partnerId: undefined,
        status: undefined
      }
      this.$refs.table.refresh(true)
    },
    filterClient (rows) {
      const { partnerId, status } = this.queryParam
      return rows.filter(item => {
        if (partnerId && !(item.partnerId || '').includes(partnerId)) return false
        if (status && item.status !== status) return false
        return true
      })
    },
    formatSuccessRate (value) {
      if (value === undefined || value === null || value === '') return '-'
      return `${value}%`
    }
  }
}
</script>

<style scoped>
.quota-page :deep(.ant-breadcrumb) {
  color: rgba(0, 0, 0, 0.65);
}

.quota-search-card {
  margin: 16px 0;
}

.quota-search-card :deep(.ant-card-body) {
  padding: 12px 16px 10px;
}

.quota-table-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.quota-search-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.quota-search-form :deep(.ant-form-item-label) {
  line-height: 1;
  padding-bottom: 4px;
}

.quota-search-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  height: auto;
}

.quota-search-actions-col {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
}

.quota-search-actions-item :deep(.ant-form-item-label) {
  visibility: hidden;
}

.quota-search-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
}

.quota-toolbar {
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

.quota-page :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}

@media (max-width: 1199px) {
  .quota-search-actions-col {
    justify-content: flex-start;
    margin-top: 8px;
  }

  .quota-search-form :deep(.ant-form-item) {
    margin-bottom: 8px;
  }

  .quota-search-actions-col :deep(.ant-form-item) {
    margin-bottom: 0;
  }
}
</style>


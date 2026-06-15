<template>
  <div class="p_16 partner-list-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>合作方管理</a-breadcrumb-item>
      <a-breadcrumb-item>合作方列表</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" class="partner-list-search-card">
      <a-form layout="vertical" class="partner-search-form">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="接入方 ID">
              <a-input v-model="queryParam.partnerId" placeholder="partnerId" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="名称">
              <a-input v-model="queryParam.partnerName" placeholder="partnerName" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="状态">
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
          <a-col :xs="24" :sm="24" :xl="6" class="partner-search-actions-col">
            <a-form-item label=" " :colon="false" class="partner-search-actions-item">
              <div class="partner-search-actions">
                <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
                <a-button @click="resetQuery">重置</a-button>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card :bordered="false" class="partner-list-table-card">
      <div class="partner-list-toolbar">
        <a-button type="primary" icon="plus" @click="goCreate">新建合作方</a-button>
        <span class="api-hint">GET /internal/admin/partners</span>
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
        <span slot="partnerId" slot-scope="text">
          <a @click="goDetail(text)">{{ text }}</a>
        </span>
        <span slot="partnerType" slot-scope="text">
          <enum-tag type="partnerType" :value="text" />
        </span>
        <span slot="status" slot-scope="text">
          <enum-tag type="partnerStatus" :value="text" />
        </span>
        <span slot="capabilities" slot-scope="text">
          {{ formatCapabilities(text) }}
        </span>
        <span slot="action" slot-scope="text, record">
          <a class="action_btn" @click="goEdit(record.partnerId)">编辑</a>
          <a-divider type="vertical" />
          <a class="action_btn" @click="goDetail(record.partnerId)">详情</a>
        </span>
      </s-table>
    </a-card>
  </div>
</template>

<script>
import { STable } from '@/components'
import EnumTag from '@/components/openPlatform/EnumTag'
import { listPartners } from '@/api/partner'
import { capabilityLabel, optionsOf } from '@/constants/openPlatformDisplay'

const columns = [
  { title: '序号', scopedSlots: { customRender: 'serial' }, width: 60 },
  { title: 'partnerId', dataIndex: 'partnerId', scopedSlots: { customRender: 'partnerId' } },
  { title: '名称', dataIndex: 'partnerName' },
  { title: '类型', dataIndex: 'partnerType', scopedSlots: { customRender: 'partnerType' } },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' } },
  { title: 'QPS', dataIndex: 'rateLimitQps', customRender: v => (v == null ? '不限' : v) },
  { title: '能力', dataIndex: 'capabilities', scopedSlots: { customRender: 'capabilities' } },
  { title: '操作', scopedSlots: { customRender: 'action' }, width: 120 }
]

export default {
  name: 'PartnerList',
  components: { STable, EnumTag },
  data () {
    return {
      columns,
      statusFilterOptions: optionsOf('partnerStatus', { includeAll: true }),
      queryParam: {
        partnerId: undefined,
        partnerName: undefined,
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
        const params = { page, size }
        return listPartners(params).then(data => {
          let items = (data && data.items) || []
          items = this.filterClient(items)
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
    filterClient (items) {
      const { partnerId, partnerName, status } = this.queryParam
      return items.filter(row => {
        if (partnerId && !(row.partnerId || '').includes(partnerId)) return false
        if (partnerName && !(row.partnerName || '').includes(partnerName)) return false
        if (status && row.status !== status) return false
        return true
      })
    },
    formatCapabilities (caps) {
      if (!caps || !caps.length) return '-'
      return caps.map(c => capabilityLabel(c)).join('、')
    },
    resetQuery () {
      this.queryParam = {
        partnerId: undefined,
        partnerName: undefined,
        status: undefined
      }
      this.$refs.table.refresh(true)
    },
    goCreate () {
      this.$router.push({ name: 'PartnerCreate' })
    },
    goEdit (partnerId) {
      this.$router.push({ name: 'PartnerEdit', params: { partnerId } })
    },
    goDetail (partnerId) {
      this.$router.push({ name: 'PartnerDetail', params: { partnerId } })
    }
  }
}
</script>

<style scoped>
.partner-list-page :deep(.ant-breadcrumb) {
  color: rgba(0, 0, 0, 0.65);
}

.partner-list-search-card {
  margin: 16px 0;
}

.partner-list-search-card :deep(.ant-card-body) {
  padding: 12px 16px 10px;
}

.partner-list-table-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.partner-search-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.partner-search-form :deep(.ant-form-item-label) {
  line-height: 1;
  padding-bottom: 4px;
}

.partner-search-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  height: auto;
}

.partner-search-actions-col {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
}

.partner-search-actions-item :deep(.ant-form-item-label) {
  visibility: hidden;
}

.partner-search-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
}

.partner-list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.partner-list-toolbar .ant-btn {
  flex-shrink: 0;
}

.api-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  font-family: Consolas, monospace;
  line-height: 32px;
}

.partner-list-page :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}

@media (max-width: 1199px) {
  .partner-search-actions-col {
    justify-content: flex-start;
    margin-top: 8px;
  }

  .partner-search-form :deep(.ant-form-item) {
    margin-bottom: 8px;
  }

  .partner-search-actions-col :deep(.ant-form-item) {
    margin-bottom: 0;
  }
}
</style>

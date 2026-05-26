<template>
  <div class="p_16">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>合作方管理</a-breadcrumb-item>
      <a-breadcrumb-item>合作方列表</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" style="margin: 16px 0; padding-top: 14px;">
      <div class="table-page-search-wrapper a_row_m_0">
        <a-form :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
          <div class="div_table">
            <div class="div_table_cell">
              <a-row :gutter="[16, 16]">
                <a-col :xs="24" :sm="12" :xl="8">
                  <a-form-item label="接入方 ID">
                    <a-input v-model="queryParam.partnerId" placeholder="partnerId" allow-clear />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :xl="8">
                  <a-form-item label="名称">
                    <a-input v-model="queryParam.partnerName" placeholder="partnerName" allow-clear />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :xl="8">
                  <a-form-item label="状态">
                    <a-select v-model="queryParam.status" placeholder="全部" allow-clear>
                      <a-select-option value="">全部</a-select-option>
                      <a-select-option value="ACTIVE">ACTIVE</a-select-option>
                      <a-select-option value="DISABLED">DISABLED</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
            </div>
            <div class="div_table_cell">
              <div class="div_table_action">
                <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
              </div>
            </div>
          </div>
        </a-form>
      </div>
    </a-card>

    <a-card :bordered="false">
      <div class="table-operator">
        <a-button type="primary" icon="plus" @click="goCreate">新建合作方</a-button>
        <span style="color: rgba(0,0,0,.45); font-size: 12px;">GET /internal/admin/partners</span>
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
          <a-tag color="blue">{{ text || '-' }}</a-tag>
        </span>
        <span slot="status" slot-scope="text">
          <a-tag :color="text === 'ACTIVE' ? 'green' : 'red'">{{ text }}</a-tag>
        </span>
        <span slot="capabilities" slot-scope="text">
          {{ formatCapabilities(text) }}
        </span>
        <span slot="action" slot-scope="text, record">
          <a @click="goEdit(record.partnerId)">编辑</a>
          <a-divider type="vertical" />
          <a @click="goDetail(record.partnerId)">详情</a>
        </span>
      </s-table>
    </a-card>
  </div>
</template>

<script>
import { STable } from '@/components'
import { listPartners } from '@/api/partner'
import { capabilityLabel } from '@/constants/openPlatformCapabilities'

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
  components: { STable },
  data () {
    return {
      columns,
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
          const result = {
            data: items,
            pageNo: (data && data.page) || page,
            totalCount: data ? data.total : items.length
          }
          return result
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
      return caps.map(c => capabilityLabel(c).split(' ')[0]).join('、')
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

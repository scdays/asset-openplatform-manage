<template>
  <div class="p_16 invocation-list-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>调用治理</a-breadcrumb-item>
      <a-breadcrumb-item>调用记录</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" class="invocation-search-card">
      <a-form layout="vertical" class="invocation-search-form">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="12" :xl="5">
            <a-form-item label="partnerId">
              <a-input v-model="queryParam.partnerId" placeholder="请输入 partnerId" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="5">
            <a-form-item label="operationId">
              <a-input v-model="queryParam.operationId" placeholder="例如 listTasks" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="response_code">
              <a-input-number v-model="queryParam.responseCode" :min="0" style="width: 100%;" placeholder="如 0/40301" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="时间范围">
              <a-range-picker
                v-model="queryRange"
                show-time
                format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%;"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :xl="4" class="invocation-search-actions-col">
            <a-form-item label=" " :colon="false" class="invocation-search-actions-item">
              <div class="invocation-search-actions">
                <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
                <a-button @click="resetQuery">重置</a-button>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card :bordered="false" class="invocation-table-card">
      <div class="invocation-list-toolbar">
        <span class="api-hint">GET /internal/admin/invocations</span>
      </div>
      <s-table
        ref="table"
        size="default"
        row-key="invocationId"
        :columns="columns"
        :data="loadData"
        :alert="false"
        :pagination="pagination"
        show-pagination="auto"
      >
        <span slot="serial" slot-scope="text, record, index">{{ index + 1 }}</span>
        <span slot="responseCode" slot-scope="text">
          <a-tag :color="text === 0 ? 'green' : 'red'">{{ text == null ? '-' : text }}</a-tag>
        </span>
        <span slot="latencyMs" slot-scope="text">{{ formatDuration(text) }}</span>
        <span slot="startedAt" slot-scope="text">{{ formatDateTime(text) }}</span>
        <span slot="errorMessage" slot-scope="text">{{ text || '-' }}</span>
      </s-table>
    </a-card>
  </div>
</template>

<script>
import { STable } from '@/components'
import { listInvocations } from '@/api/openPlatform/invocation'

const columns = [
  { title: '序号', scopedSlots: { customRender: 'serial' }, width: 60 },
  { title: 'requestId', dataIndex: 'requestId', ellipsis: true, width: 220 },
  { title: 'partnerId', dataIndex: 'partnerId', width: 160 },
  { title: 'operationId', dataIndex: 'operationId', width: 150 },
  { title: '请求路径', dataIndex: 'requestPath', ellipsis: true },
  { title: 'code', dataIndex: 'responseCode', scopedSlots: { customRender: 'responseCode' }, width: 90 },
  { title: '耗时', dataIndex: 'latencyMs', scopedSlots: { customRender: 'latencyMs' }, width: 90 },
  { title: '开始时间', dataIndex: 'startedAt', scopedSlots: { customRender: 'startedAt' }, width: 180 },
  { title: '失败原因', dataIndex: 'errorMessage', scopedSlots: { customRender: 'errorMessage' } }
]

export default {
  name: 'InvocationList',
  components: { STable },
  data () {
    return {
      columns,
      queryParam: {
        partnerId: undefined,
        operationId: undefined,
        responseCode: undefined
      },
      queryRange: [],
      pagination: {
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: total => `共 ${total} 条`
      },
      loadData: parameter => {
        const page = parameter.pageNo || 1
        const size = parameter.pageSize || 10
        const params = Object.assign({}, this.queryParam, this.buildRangeParams(), { page, size })
        return listInvocations(params).then(data => {
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
        operationId: undefined,
        responseCode: undefined
      }
      this.queryRange = []
      this.$refs.table.refresh(true)
    },
    buildRangeParams () {
      if (!this.queryRange || this.queryRange.length !== 2) {
        return {}
      }
      const [from, to] = this.queryRange
      return {
        startedFrom: from ? from.format('YYYY-MM-DD HH:mm:ss') : undefined,
        startedTo: to ? to.format('YYYY-MM-DD HH:mm:ss') : undefined
      }
    },
    formatDuration (latencyMs) {
      if (latencyMs === undefined || latencyMs === null || latencyMs === '') {
        return '-'
      }
      return `${latencyMs} ms`
    },
    formatDateTime (value) {
      if (!value) return '-'
      return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value
    }
  }
}
</script>

<style scoped>
.invocation-list-page :deep(.ant-breadcrumb) {
  color: rgba(0, 0, 0, 0.65);
}

.invocation-search-card {
  margin: 16px 0;
}

.invocation-search-card :deep(.ant-card-body) {
  padding: 12px 16px 10px;
}

.invocation-table-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.invocation-search-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.invocation-search-form :deep(.ant-form-item-label) {
  line-height: 1;
  padding-bottom: 4px;
}

.invocation-search-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  height: auto;
}

.invocation-search-actions-col {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
}

.invocation-search-actions-item :deep(.ant-form-item-label) {
  visibility: hidden;
}

.invocation-search-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
}

.invocation-list-toolbar {
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

.invocation-list-page :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}

@media (max-width: 1199px) {
  .invocation-search-actions-col {
    justify-content: flex-start;
    margin-top: 8px;
  }

  .invocation-search-form :deep(.ant-form-item) {
    margin-bottom: 8px;
  }

  .invocation-search-actions-col :deep(.ant-form-item) {
    margin-bottom: 0;
  }
}
</style>

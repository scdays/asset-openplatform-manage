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
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="partnerId">
              <a-input v-model="queryParam.partnerId" placeholder="请输入 partnerId" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="业务域">
              <a-select v-model="queryParam.domain" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in domainFilterOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="operationId">
              <a-input v-model="queryParam.operationId" placeholder="例如 verifyInstance" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="resourceId">
              <a-input v-model="queryParam.resourceId" placeholder="taskId / vulInfoID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="3">
            <a-form-item label="响应码">
              <a-input-number v-model="queryParam.responseCode" :min="0" style="width: 100%;" placeholder="如 0、40001" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="5">
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
        <span class="toolbar-note">联调重点：instances 写操作 resourceId = vulInfoID</span>
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
        <span slot="domain" slot-scope="text">
          <enum-tag type="domain" :value="text" />
        </span>
        <span slot="resourceId" slot-scope="text">
          <code v-if="text">{{ text }}</code>
          <span v-else>-</span>
        </span>
        <span slot="caseId" slot-scope="text, record">
          <a v-if="record.caseId" @click="goCase(record.caseId)"><code>{{ record.caseId }}</code></a>
          <span v-else>-</span>
        </span>
        <span slot="responseCode" slot-scope="text">
          <response-code-tag :value="text" />
        </span>
        <span slot="latencyMs" slot-scope="text">{{ formatDuration(text) }}</span>
        <span slot="startedAt" slot-scope="text">{{ formatDateTime(text) }}</span>
        <span slot="action" slot-scope="text, record">
          <a @click="goDetail(record)">详情</a>
          <a-divider type="vertical" />
          <a class="preview-link" @click="openPreview(record)">预览</a>
        </span>
      </s-table>
    </a-card>

    <invocation-preview-drawer
      :visible="previewVisible"
      :invocation-id="previewInvocationId"
      @close="previewVisible = false"
    />
  </div>
</template>

<script>
import { STable } from '@/components'
import EnumTag from '@/components/openPlatform/EnumTag'
import ResponseCodeTag from '@/components/openPlatform/ResponseCodeTag'
import { optionsOf } from '@/constants/openPlatformDisplay'
import { listInvocations } from '@/api/openPlatform/invocation'
import InvocationPreviewDrawer from './components/InvocationPreviewDrawer'

const columns = [
  { title: '序号', scopedSlots: { customRender: 'serial' }, width: 60 },
  { title: 'requestId', dataIndex: 'requestId', ellipsis: true, width: 200 },
  { title: 'partnerId', dataIndex: 'partnerId', width: 140 },
  { title: '业务域', dataIndex: 'domain', scopedSlots: { customRender: 'domain' }, width: 100 },
  { title: 'operationId', dataIndex: 'operationId', width: 140 },
  { title: 'resourceId', dataIndex: 'resourceId', scopedSlots: { customRender: 'resourceId' }, width: 140 },
  { title: 'caseId', dataIndex: 'caseId', scopedSlots: { customRender: 'caseId' }, width: 140 },
  { title: '响应码', dataIndex: 'responseCode', scopedSlots: { customRender: 'responseCode' }, width: 140 },
  { title: '耗时', dataIndex: 'latencyMs', scopedSlots: { customRender: 'latencyMs' }, width: 80 },
  { title: '开始时间', dataIndex: 'startedAt', scopedSlots: { customRender: 'startedAt' }, width: 170 },
  { title: '操作', scopedSlots: { customRender: 'action' }, width: 120, fixed: 'right' }
]

function buildQueryParamFromRoute (route) {
  const q = (route && route.query) || {}
  const pick = key => {
    if (q[key] === undefined || q[key] === '') {
      return undefined
    }
    return q[key]
  }
  return {
    partnerId: pick('partnerId'),
    domain: undefined,
    operationId: undefined,
    responseCode: undefined,
    resourceId: pick('resourceId'),
    resourceType: q.resourceId !== undefined ? undefined : pick('resourceType')
  }
}

export default {
  name: 'InvocationList',
  components: { STable, EnumTag, ResponseCodeTag, InvocationPreviewDrawer },
  data () {
    return {
      columns,
      domainFilterOptions: optionsOf('domain', { includeAll: true }),
      queryParam: buildQueryParamFromRoute(this.$route),
      queryRange: [],
      previewVisible: false,
      previewInvocationId: '',
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
  mounted () {
    this.syncRouteQuery()
  },
  activated () {
    this.syncRouteQuery()
  },
  watch: {
    '$route.query': {
      handler () {
        this.syncRouteQuery()
      },
      deep: true
    }
  },
  methods: {
    syncRouteQuery () {
      const nextQuery = buildQueryParamFromRoute(this.$route)
      let changed = false
      ;['partnerId', 'resourceId', 'resourceType'].forEach(key => {
        if (nextQuery[key] !== this.queryParam[key]) {
          changed = true
        }
      })
      if (changed) {
        this.queryParam = Object.assign({}, this.queryParam, {
          partnerId: nextQuery.partnerId,
          resourceId: nextQuery.resourceId,
          resourceType: nextQuery.resourceType
        })
      }
      const q = this.$route.query || {}
      const hasLinkQuery = q.partnerId !== undefined || q.resourceId !== undefined
      if (changed || hasLinkQuery) {
        this.scheduleTableRefresh()
      }
    },
    scheduleTableRefresh () {
      const refreshTable = () => {
        if (this.$refs.table) {
          this.$refs.table.refresh(true)
          return true
        }
        return false
      }
      this.$nextTick(() => {
        if (!refreshTable()) {
          this.$nextTick(refreshTable)
        }
      })
    },
    resetQuery () {
      this.queryParam = {
        partnerId: undefined,
        domain: undefined,
        operationId: undefined,
        responseCode: undefined,
        resourceId: undefined,
        resourceType: undefined
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
    goDetail (record) {
      if (!record || !record.invocationId) return
      this.$router.push({ name: 'InvocationDetail', params: { invocationId: record.invocationId } })
    },
    goCase (caseId) {
      if (!caseId) return
      this.$router.push({ name: 'OperationCaseWorkspace', params: { caseId } })
    },
    openPreview (record) {
      if (!record || !record.invocationId) return
      this.previewInvocationId = record.invocationId
      this.previewVisible = true
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
  flex-wrap: wrap;
}

.api-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  font-family: Consolas, monospace;
}

.toolbar-note {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.preview-link {
  color: rgba(0, 0, 0, 0.45);
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

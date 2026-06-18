<template>
  <div class="p_16 operation-case-list-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>运营案件</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 16px;"
      message="统一运营视图：Partner 写操作（创建任务 / 实例验证处置 / 修复核验）均归属 case_id，从此进入统一工作台。"
    />

    <a-card :bordered="false" class="search-card">
      <a-form layout="vertical">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="partnerId">
              <a-input v-model="queryParam.partnerId" placeholder="接入方 ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="caseId">
              <a-input v-model="queryParam.caseId" placeholder="CASE-xxx" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="案件类型">
              <a-select v-model="queryParam.caseType" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in caseTypeOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="3">
            <a-form-item label="状态">
              <a-select v-model="queryParam.status" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in statusOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="主资源 ID">
              <a-input v-model="queryParam.primaryResourceId" placeholder="taskId / vulInfoId / jobId" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :xl="5">
            <a-form-item label=" ">
              <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
              <a-button style="margin-left: 8px;" @click="resetQuery">重置</a-button>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <div class="toolbar">
        <span class="api-hint">GET /internal/admin/operation-cases</span>
        <a-button size="small" :loading="backfillLoading" style="float: right;" @click="runBackfill(false)">
          历史回填
        </a-button>
        <a-button size="small" :loading="backfillLoading" style="float: right; margin-right: 8px;" @click="runBackfill(true)">
          回填预检
        </a-button>
      </div>
      <s-table
        ref="table"
        size="default"
        row-key="caseId"
        :columns="columns"
        :data="loadData"
        :alert="false"
        :pagination="pagination"
        show-pagination="auto"
      >
        <span slot="caseId" slot-scope="text">
          <code>{{ text }}</code>
        </span>
        <span slot="caseType" slot-scope="text">
          <enum-tag type="operationCaseType" :value="text" />
        </span>
        <span slot="status" slot-scope="text">
          <enum-tag type="operationCaseStatus" :value="text" />
        </span>
        <span slot="primaryResourceId" slot-scope="text">
          <code v-if="text">{{ text }}</code>
          <span v-else class="muted">-</span>
        </span>
        <span slot="startedAt" slot-scope="text">{{ formatDateTime(text) }}</span>
        <span slot="action" slot-scope="text, record">
          <a @click="goWorkspace(record)">工作台</a>
        </span>
      </s-table>
    </a-card>
  </div>
</template>

<script>
import { STable } from '@/components'
import EnumTag from '@/components/openPlatform/EnumTag'
import { optionsOf } from '@/constants/openPlatformDisplay'
import { listOperationCases, backfillOperationCases } from '@/api/openPlatform/operationCase'

const columns = [
  { title: 'caseId', dataIndex: 'caseId', scopedSlots: { customRender: 'caseId' }, width: 150 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '类型', dataIndex: 'caseType', scopedSlots: { customRender: 'caseType' }, width: 130 },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 100 },
  { title: 'partnerId', dataIndex: 'partnerId', width: 120, ellipsis: true },
  { title: '主资源', dataIndex: 'primaryResourceId', scopedSlots: { customRender: 'primaryResourceId' }, width: 140 },
  { title: '开始时间', dataIndex: 'startedAt', scopedSlots: { customRender: 'startedAt' }, width: 170 },
  { title: '操作', scopedSlots: { customRender: 'action' }, width: 90, fixed: 'right' }
]

export default {
  name: 'OperationCaseList',
  components: { STable, EnumTag },
  data () {
    return {
      columns,
      caseTypeOptions: optionsOf('operationCaseType', { includeAll: true }),
      statusOptions: optionsOf('operationCaseStatus', { includeAll: true }),
      queryParam: {
        partnerId: undefined,
        caseId: undefined,
        caseType: undefined,
        status: undefined,
        primaryResourceId: undefined
      },
      pagination: {
        showTotal: total => `共 ${total} 条`,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50']
      },
      backfillLoading: false
    }
  },
  methods: {
    loadData (parameter) {
      const page = (parameter && parameter.pageNo) || 1
      const size = (parameter && parameter.pageSize) || 20
      return listOperationCases({ ...this.queryParam, page, size }).then(res => ({
        pageNo: page,
        pageSize: size,
        totalCount: (res && res.total) || 0,
        data: (res && res.items) || []
      }))
    },
    resetQuery () {
      this.queryParam = {
        partnerId: undefined,
        caseId: undefined,
        caseType: undefined,
        status: undefined,
        primaryResourceId: undefined
      }
      this.$refs.table.refresh(true)
    },
    goWorkspace (record) {
      this.$router.push({ name: 'OperationCaseWorkspace', params: { caseId: record.caseId } })
    },
    runBackfill (dryRun) {
      this.backfillLoading = true
      backfillOperationCases({ partnerId: this.queryParam.partnerId, limit: 200, dryRun })
        .then(res => {
          const d = res || {}
          const title = dryRun ? '回填预检完成' : '历史回填完成'
          const content = `新建案件 ${d.casesCreated || 0} · 关联 invocation ${d.invocationsLinked || 0} · task ${d.tasksLinked || 0} · job ${d.jobsLinked || 0}`
          this.$message.success(`${title}：${content}`)
          if (!dryRun) this.$refs.table.refresh(true)
        })
        .finally(() => { this.backfillLoading = false })
    },
    formatDateTime (value) {
      if (!value) return '-'
      return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value
    }
  }
}
</script>

<style scoped>
.toolbar { margin-bottom: 12px; }
.api-hint { color: rgba(0,0,0,.45); font-size: 12px; }
.muted { color: rgba(0,0,0,.45); }
.search-card { margin-bottom: 16px; }
</style>

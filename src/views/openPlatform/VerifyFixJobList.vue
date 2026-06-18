<template>
  <div class="p_16 verify-fix-job-list-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>修复核验</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 16px;"
      message="运营视图：跨接入方查看 open_verify_fix_job 复扫进度。对标 风险排查工作台，跟踪子任务、报告路径与逐项 6/7/10。"
    />

    <a-card :bordered="false" class="search-card">
      <a-form layout="vertical">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="12" :xl="5">
            <a-form-item label="partnerId">
              <a-input v-model="queryParam.partnerId" placeholder="接入方 ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="5">
            <a-form-item label="jobId">
              <a-input v-model="queryParam.jobId" placeholder="VF-xxx" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="5">
            <a-form-item label="taskId">
              <a-input v-model="queryParam.taskId" placeholder="关联 open_task" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="状态">
              <a-select v-model="queryParam.status" placeholder="全部" allow-clear>
                <a-select-option value="PENDING">PENDING</a-select-option>
                <a-select-option value="RUNNING">RUNNING</a-select-option>
                <a-select-option value="FINISHED">FINISHED</a-select-option>
                <a-select-option value="FAILED">FAILED</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :xl="5">
            <a-form-item label=" " :colon="false">
              <a-button type="primary" @click="loadData">查询</a-button>
              <a-button style="margin-left: 8px;" @click="resetQuery">重置</a-button>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <div class="toolbar">
        <span class="api-hint">GET /internal/admin/verify-fix/jobs</span>
      </div>
      <a-table
        size="default"
        row-key="jobId"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
      >
        <span slot="jobId" slot-scope="text">
          <code>{{ text }}</code>
        </span>
        <span slot="caseId" slot-scope="text, record">
          <a v-if="record.caseId" @click="goCase(record.caseId)"><code>{{ record.caseId }}</code></a>
          <span v-else class="muted">-</span>
        </span>
        <span slot="status" slot-scope="text">
          <a-tag :color="statusColor(text)">{{ text || '-' }}</a-tag>
        </span>
        <span slot="createdAt" slot-scope="text">{{ formatDateTime(text) }}</span>
        <span slot="action" slot-scope="text, record">
          <a @click="goWorkspace(record)">工作台</a>
        </span>
      </a-table>
    </a-card>
  </div>
</template>

<script>
import { listVerifyFixJobs } from '@/api/openPlatform/verifyFix'

const columns = [
  { title: 'jobId', dataIndex: 'jobId', scopedSlots: { customRender: 'jobId' }, width: 140 },
  { title: 'caseId', dataIndex: 'caseId', scopedSlots: { customRender: 'caseId' }, width: 140 },
  { title: 'partnerId', dataIndex: 'partnerId', width: 120, ellipsis: true },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 100 },
  { title: '条数', dataIndex: 'itemCount', width: 64 },
  { title: '进度', dataIndex: 'progress', width: 72 },
  { title: '复扫 sub', dataIndex: 'rescanSubCount', width: 80 },
  { title: '创建时间', dataIndex: 'createdAt', scopedSlots: { customRender: 'createdAt' }, width: 170 },
  { title: '操作', scopedSlots: { customRender: 'action' }, width: 90, fixed: 'right' }
]

export default {
  name: 'VerifyFixJobList',
  data () {
    return {
      columns,
      rows: [],
      loading: false,
      queryParam: {
        partnerId: undefined,
        jobId: undefined,
        taskId: undefined,
        status: undefined
      },
      pagination: {
        pageSize: 20,
        showSizeChanger: true,
        showTotal: total => `共 ${total} 条`
      }
    }
  },
  created () {
    const q = this.$route.query || {}
    if (q.partnerId) this.queryParam.partnerId = q.partnerId
    if (q.taskId) this.queryParam.taskId = q.taskId
    this.loadData()
  },
  watch: {
    '$route.query': {
      deep: true,
      handler () {
        const q = this.$route.query || {}
        this.queryParam.partnerId = q.partnerId || undefined
        this.queryParam.taskId = q.taskId || undefined
        this.loadData()
      }
    }
  },
  methods: {
    formatDateTime (value) {
      if (!value) return '-'
      return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value
    },
    async loadData () {
      this.loading = true
      try {
        let data = await listVerifyFixJobs({
          partnerId: this.queryParam.partnerId,
          status: this.queryParam.status,
          taskId: this.queryParam.taskId,
          limit: 100
        })
        data = Array.isArray(data) ? data : []
        const jobFilter = (this.queryParam.jobId || '').trim()
        if (jobFilter) {
          data = data.filter(row => row.jobId && row.jobId.indexOf(jobFilter) >= 0)
        }
        this.rows = data
        this.pagination = { ...this.pagination, total: data.length }
      } catch (e) {
        this.rows = []
        this.$message.error(e.message || '加载失败')
      } finally {
        this.loading = false
      }
    },
    resetQuery () {
      this.queryParam = { partnerId: undefined, jobId: undefined, taskId: undefined, status: undefined }
      this.loadData()
    },
    goWorkspace (record) {
      this.$router.push({ name: 'VerifyFixWorkspace', params: { jobId: record.jobId } })
    },
    goCase (caseId) {
      this.$router.push({ name: 'OperationCaseWorkspace', params: { caseId } })
    },
    statusColor (status) {
      if (status === 'FINISHED') return 'green'
      if (status === 'FAILED') return 'red'
      if (status === 'RUNNING') return 'blue'
      return 'orange'
    }
  }
}
</script>

<style scoped>
.toolbar { margin-bottom: 12px; }
.api-hint { font-size: 12px; color: rgba(0,0,0,.45); }
.muted { color: rgba(0,0,0,.45); }
.search-card { margin: 16px 0; }
</style>

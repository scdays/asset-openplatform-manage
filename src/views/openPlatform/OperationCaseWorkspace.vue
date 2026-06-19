<template>
  <div class="p_16 operation-case-workspace-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OperationCaseList' })">运营案件</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>统一工作台</a-breadcrumb-item>
    </a-breadcrumb>

    <a-spin :spinning="loading">
      <template v-if="workspace && workspace.caseSummary">
        <a-card :bordered="false" class="header-card">
          <div class="title-row">
            <h2 class="title">{{ workspace.caseSummary.title || workspace.caseSummary.caseId }}</h2>
            <enum-tag type="operationCaseType" :value="workspace.caseSummary.caseType" />
            <enum-tag type="operationCaseStatus" :value="workspace.caseSummary.status" />
          </div>
          <div class="meta-row">
            caseId <code>{{ workspace.caseSummary.caseId }}</code>
            · partner <code>{{ workspace.caseSummary.partnerId }}</code>
            · 主资源类型
            <enum-tag
              v-if="workspace.caseSummary.primaryResourceType"
              type="primaryResourceType"
              :value="workspace.caseSummary.primaryResourceType"
              with-code
            />
            <span v-else>-</span>
            · 主资源 ID
            <code v-if="workspace.caseSummary.primaryResourceId">{{ workspace.caseSummary.primaryResourceId }}</code>
            <span v-else>-</span>
            · invocation <code>{{ workspace.caseSummary.invocationId || '-' }}</code>
          </div>
          <div class="quick-links">
            <a-button
              v-if="canRetryDispatch"
              size="small"
              type="primary"
              :loading="retryLoading"
              @click="retryDispatch"
            >重试下发</a-button>
            <a-button
              v-if="showOpenTaskWorkspace"
              size="small"
              :style="{ marginLeft: canRetryDispatch ? '8px' : '0' }"
              @click="goOpenTaskWorkspace"
            >风险排查工作台</a-button>
            <a-button
              v-if="showVerifyFixWorkspace"
              size="small"
              style="margin-left: 8px;"
              @click="goVerifyFixWorkspace"
            >修复核验工作台</a-button>
            <a-button
              v-if="workspace.caseSummary.invocationId"
              size="small"
              style="margin-left: 8px;"
              @click="goInvocation"
            >查看受理 API</a-button>
          </div>
        </a-card>

        <a-card :bordered="false">
          <a-tabs v-model="activeTab">
            <a-tab-pane key="payload" tab="业务载荷">
              <task-scan-case-panel
                v-if="isTaskScan"
                :payload="workspace.payload"
              />
              <verify-fix-case-panel
                v-else-if="isVerifyFix"
                :payload="workspace.payload"
              />
              <instance-op-case-panel
                v-else-if="isInstanceOp"
                :payload="workspace.payload"
              />
              <batch-case-panel
                v-else-if="isBatch"
                :payload="workspace.payload"
              />
              <a-empty v-else description="暂无业务载荷" />
            </a-tab-pane>

            <a-tab-pane key="timeline" tab="案件时间线">
              <a-timeline v-if="(workspace.timeline || []).length">
                <a-timeline-item
                  v-for="ev in workspace.timeline"
                  :key="ev.id || ev.eventType + (ev.createdAt || '')"
                >
                  <strong>{{ ev.eventType }}</strong>
                  <div class="timeline-at">{{ formatDateTime(ev.createdAt) }}</div>
                  <pre v-if="ev.eventPayloadJson" class="payload-pre">{{ ev.eventPayloadJson }}</pre>
                </a-timeline-item>
              </a-timeline>
              <a-empty v-else description="暂无事件" />
            </a-tab-pane>

            <a-tab-pane key="invocations" tab="API 调用">
              <a-table
                size="small"
                row-key="invocationId"
                :columns="invocationColumns"
                :data-source="workspace.invocations || []"
                :pagination="false"
              >
                <span slot="operationId" slot-scope="text">
                  <enum-tag v-if="text" type="apiOperation" :value="text" with-code />
                  <span v-else>-</span>
                </span>
                <span slot="responseCode" slot-scope="text">
                  <response-code-tag :value="text" />
                </span>
                <span slot="caseId" slot-scope="text, record">
                  <a v-if="record.caseId" @click="goCase(record.caseId)">{{ record.caseId }}</a>
                  <span v-else>-</span>
                </span>
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="webhooks" tab="Webhook">
              <a-table
                size="small"
                row-key="id"
                :columns="webhookColumns"
                :data-source="workspace.webhooks || []"
                :pagination="false"
              />
            </a-tab-pane>

            <a-tab-pane key="stateLogs" tab="跃迁日志">
              <a-table
                size="small"
                row-key="id"
                :columns="stateLogColumns"
                :data-source="workspace.stateLogs || []"
                :pagination="{ pageSize: 20 }"
              >
                <span slot="prevStat" slot-scope="text">
                  <enum-tag v-if="text != null && text !== ''" type="vulInfoStat" :value="text" with-code />
                  <span v-else>-</span>
                </span>
                <span slot="vulInfoStat" slot-scope="text">
                  <enum-tag v-if="text != null && text !== ''" type="vulInfoStat" :value="text" with-code />
                  <span v-else>-</span>
                </span>
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<script>
import EnumTag from '@/components/openPlatform/EnumTag'
import ResponseCodeTag from '@/components/openPlatform/ResponseCodeTag'
import { getOperationCaseWorkspace, retryOperationCaseDispatch } from '@/api/openPlatform/operationCase'
import TaskScanCasePanel from './components/operationCase/TaskScanCasePanel'
import VerifyFixCasePanel from './components/operationCase/VerifyFixCasePanel'
import InstanceOpCasePanel from './components/operationCase/InstanceOpCasePanel'
import BatchCasePanel from './components/operationCase/BatchCasePanel'

const invocationColumns = [
  { title: 'API 操作', dataIndex: 'operationId', scopedSlots: { customRender: 'operationId' }, width: 200 },
  { title: '响应码', dataIndex: 'responseCode', scopedSlots: { customRender: 'responseCode' }, width: 100 },
  { title: 'resourceId', dataIndex: 'resourceId', ellipsis: true },
  { title: 'caseId', dataIndex: 'caseId', scopedSlots: { customRender: 'caseId' }, width: 140 },
  { title: '耗时 ms', dataIndex: 'latencyMs', width: 80 }
]

const webhookColumns = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '事件', dataIndex: 'eventType', width: 180 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: 'resourceId', dataIndex: 'resourceId', ellipsis: true },
  { title: '时间', dataIndex: 'createdAt', width: 170 }
]

const stateLogColumns = [
  { title: 'vulInfoId', dataIndex: 'vulInfoId', width: 140 },
  { title: '前状态', dataIndex: 'prevStat', scopedSlots: { customRender: 'prevStat' }, width: 120 },
  { title: '后状态', dataIndex: 'vulInfoStat', scopedSlots: { customRender: 'vulInfoStat' }, width: 120 },
  { title: '原因', dataIndex: 'changeReason', width: 140 },
  { title: '时间', dataIndex: 'createdAt', width: 170 }
]

export default {
  name: 'OperationCaseWorkspace',
  components: {
    EnumTag,
    ResponseCodeTag,
    TaskScanCasePanel,
    VerifyFixCasePanel,
    InstanceOpCasePanel,
    BatchCasePanel
  },
  data () {
    return {
      loading: false,
      workspace: null,
      activeTab: 'payload',
      invocationColumns,
      webhookColumns,
      stateLogColumns,
      retryLoading: false
    }
  },
  computed: {
    caseType () {
      return this.workspace && this.workspace.caseSummary
        ? this.workspace.caseSummary.caseType
        : ''
    },
    isTaskScan () { return this.caseType === 'TASK_SCAN' },
    isVerifyFix () { return this.caseType === 'VERIFY_FIX' },
    isInstanceOp () {
      return this.caseType === 'INSTANCE_VERIFY' || this.caseType === 'INSTANCE_REMEDIATE'
    },
    isBatch () { return this.caseType === 'INSTANCE_BATCH' },
    primaryResourceType () {
      const summary = this.workspace && this.workspace.caseSummary
      return summary && summary.primaryResourceType ? summary.primaryResourceType : ''
    },
    taskScanTaskId () {
      if (!this.workspace) return ''
      const payload = this.workspace.payload
      const summary = this.workspace.caseSummary
      if (payload && payload.taskId) return payload.taskId
      if (payload && payload.taskWorkspace && payload.taskWorkspace.task) {
        return payload.taskWorkspace.task.taskId || ''
      }
      if (summary && summary.primaryResourceType === 'TASK' && summary.primaryResourceId) {
        return summary.primaryResourceId
      }
      return ''
    },
    verifyFixJobId () {
      if (!this.workspace) return ''
      const payload = this.workspace.payload
      const summary = this.workspace.caseSummary
      if (payload && payload.verifyFixWorkspace && payload.verifyFixWorkspace.job) {
        return payload.verifyFixWorkspace.job.jobId || ''
      }
      if (payload && payload.job) {
        return payload.job.jobId || ''
      }
      if (summary && summary.primaryResourceType === 'VERIFY_FIX_JOB' && summary.primaryResourceId) {
        return summary.primaryResourceId
      }
      return ''
    },
    showOpenTaskWorkspace () {
      return this.primaryResourceType === 'TASK' && !!this.taskScanTaskId
    },
    showVerifyFixWorkspace () {
      return this.primaryResourceType === 'VERIFY_FIX_JOB' && !!this.verifyFixJobId
    },
    canRetryDispatch () {
      if (!this.workspace || !this.workspace.caseSummary) return false
      const type = this.workspace.caseSummary.caseType
      const status = this.workspace.caseSummary.status
      if (type === 'TASK_SCAN') {
        return status === 'RUNNING' || status === 'FAILED'
      }
      if (type === 'VERIFY_FIX') {
        return status === 'RUNNING' || status === 'FAILED'
      }
      return false
    }
  },
  watch: {
    '$route.params.caseId': {
      immediate: true,
      handler (id) {
        if (id) this.loadWorkspace(id)
      }
    }
  },
  methods: {
    loadWorkspace (caseId) {
      this.loading = true
      getOperationCaseWorkspace(caseId)
        .then(res => {
          this.workspace = res || null
          const tab = this.$route.query.tab
          if (tab) this.activeTab = tab
        })
        .catch(err => {
          this.workspace = null
          this.$message.error((err && err.message) || '案件工作台加载失败')
        })
        .finally(() => { this.loading = false })
    },
    goOpenTaskWorkspace () {
      if (!this.taskScanTaskId) return
      this.$router.push({ name: 'OpenTaskWorkspace', params: { taskId: this.taskScanTaskId } })
    },
    goVerifyFixWorkspace () {
      if (!this.verifyFixJobId) return
      this.$router.push({ name: 'VerifyFixWorkspace', params: { jobId: this.verifyFixJobId } })
    },
    goInvocation () {
      const id = this.workspace.caseSummary.invocationId
      if (id) this.$router.push({ name: 'InvocationDetail', params: { invocationId: id } })
    },
    goCase (caseId) {
      this.$router.push({ name: 'OperationCaseWorkspace', params: { caseId } })
    },
    retryDispatch () {
      const caseId = this.workspace && this.workspace.caseSummary && this.workspace.caseSummary.caseId
      if (!caseId) return
      this.retryLoading = true
      retryOperationCaseDispatch(caseId)
        .then(res => {
          const d = res || {}
          if (d.success) {
            this.$message.success(d.message || '重试已提交')
            this.loadWorkspace(caseId)
          } else {
            this.$message.warning(d.message || '重试未成功')
          }
        })
        .catch(err => {
          this.$message.error((err && err.message) || '重试提交失败')
        })
        .finally(() => { this.retryLoading = false })
    },
    formatDateTime (value) {
      if (!value) return '-'
      return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value
    }
  }
}
</script>

<style scoped>
.header-card { margin-bottom: 16px; }
.title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.title { margin: 0; font-size: 18px; font-weight: 500; }
.meta-row { color: rgba(0,0,0,.45); font-size: 13px; margin-top: 8px; }
.quick-links { margin-top: 12px; }
.timeline-at { color: rgba(0,0,0,.45); font-size: 12px; }
.payload-pre {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  padding: 8px;
  font-size: 12px;
  margin-top: 6px;
  max-height: 120px;
  overflow: auto;
}
</style>

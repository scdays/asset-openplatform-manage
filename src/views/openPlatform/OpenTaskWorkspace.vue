<template>
  <div class="p_16 open-task-workspace-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenTaskList' })">OPEN 编排任务</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>任务实例工作台</a-breadcrumb-item>
    </a-breadcrumb>

    <a-spin :spinning="loading">
      <template v-if="workspace && workspace.task">
        <a-card :bordered="false" class="workspace-header-card">
          <div class="workspace-title">
            {{ workspace.task.taskName }}
            <enum-tag type="openTaskStatus" :value="workspace.task.status" />
            <a-tag v-if="workspace.task.autoVerify" color="green">autoVerify</a-tag>
            <a-tag v-if="workspace.task.crossScan" color="purple">
              {{ workspace.task.verifyMergeStrategy === 'UNION' ? 'SOC 并集' : '交集' }}
            </a-tag>
            <a-tag>{{ workspace.task.adapterMode }}</a-tag>
          </div>
          <div class="workspace-meta">
            taskId <code>{{ workspace.task.taskId }}</code>
            · extTaskId <code>{{ workspace.task.extTaskId }}</code>
            · partner <code>{{ workspace.task.partnerId }}</code>
            · type <code>{{ workspace.task.vulnType }}</code>
            · scanTemplateId <code>{{ workspace.task.scanTemplateId }}</code>
            · 目标 <code>{{ workspace.targetHosts || '-' }}</code>
          </div>
        </a-card>

        <div class="phase-banner">
          <div class="phase-box" :class="phaseClass('survey')">
            <h4><a-tag color="green">阶段1</a-tag> 排查 · scan_phase=1</h4>
            <div class="kv"><span>子任务</span><span>{{ (workspace.surveySubs || []).length }} 个</span></div>
            <div class="kv"><span>状态</span><span>{{ surveyPhaseStatus }}</span></div>
            <div class="kv"><span>实例</span><span>{{ workspace.task.instanceCount || 0 }} 条</span></div>
            <div v-if="workspace.task.autoVerify" class="kv warn">
              <span>回调</span><span>已推迟（autoVerify=true）</span>
            </div>
          </div>
          <div class="phase-arrow">→</div>
          <div class="phase-box" :class="phaseClass('verify')">
            <h4><a-tag color="blue">阶段2</a-tag> 验证 · scan_phase=2</h4>
            <div class="kv"><span>子任务</span><span>{{ (workspace.verifySubs || []).length }} 个</span></div>
            <div class="kv"><span>合并</span><span>{{ workspace.task.verifyMergeStrategy || '-' }}</span></div>
            <div class="kv"><span>进度</span><span>{{ verifyPhaseStatus }}</span></div>
          </div>
        </div>

        <a-card :bordered="false">
          <a-tabs v-model="activeTab">
            <a-tab-pane key="overview" tab="概览">
              <a-alert
                v-if="workspace.task.autoVerify"
                type="warning"
                show-icon
                message="推迟回调：autoVerify=true 时排查完成不触发 TASK_COMPLETED；验证阶段全部完成后统一回调。"
                style="margin-bottom: 16px;"
              />
              <div class="section-label">全链路时序</div>
              <a-timeline>
                <a-timeline-item
                  v-for="(ev, idx) in workspace.timeline || []"
                  :key="idx"
                  :color="timelineColor(ev.state)"
                >
                  {{ ev.label }}
                  <div v-if="ev.at" class="timeline-at">{{ formatDateTime(ev.at) }}</div>
                </a-timeline-item>
              </a-timeline>
            </a-tab-pane>

            <a-tab-pane key="survey" tab="排查子任务">
              <div v-if="canRetrySurvey" class="survey-retry-toolbar">
                <a-alert
                  type="warning"
                  show-icon
                  message="存在排查子任务下发失败，可手动重试向 vuln-task-center 下发 SOC 扫描。"
                  style="margin-bottom: 12px;"
                />
                <a-button
                  type="primary"
                  :loading="retryLoading"
                  @click="retrySurveyDispatch()"
                >
                  重试全部排查下发
                </a-button>
                <span class="api-hint">POST /internal/admin/open-tasks/{taskId}/retry-dispatch</span>
              </div>
              <sub-task-table
                :rows="workspace.surveySubs"
                :show-retry="canRetrySurvey"
                @retry-sub="retrySurveyDispatch"
              />
            </a-tab-pane>

            <a-tab-pane key="surveyResults" tab="排查结果">
              <div class="survey-results-toolbar">
                <a-select
                  v-model="surveySubId"
                  placeholder="选择子任务"
                  style="width: 280px; margin-right: 8px;"
                  allow-clear
                  @change="loadSurveyResults"
                >
                  <a-select-option
                    v-for="sub in workspace.surveySubs || []"
                    :key="sub.subId"
                    :value="sub.subId"
                  >
                    {{ sub.scannerLabel }} · {{ sub.status }} · {{ sub.surveyId || '无 surveyId' }}
                  </a-select-option>
                </a-select>
                <a-button :loading="surveyLoading" @click="loadSurveyResults">刷新 VTC 结果</a-button>
                <span class="api-hint">GET /internal/admin/open-tasks/{taskId}/survey-results</span>
              </div>
              <a-alert
                v-if="surveyResults && surveyResults.hint"
                :type="surveyResults.source === 'task-center' ? 'info' : 'warning'"
                show-icon
                :message="surveyResults.hint"
                style="margin: 12px 0;"
              />
              <a-spin :spinning="surveyLoading">
                <template v-if="surveyResults && surveyResults.source === 'task-center'">
                  <a-tabs size="small" default-active-key="live">
                    <a-tab-pane key="live" :tab="`存活探测 (${liveCount})`">
                      <a-row :gutter="16" style="margin-bottom: 12px;">
                        <a-col :span="8">
                          <a-statistic title="存活" :value="(surveyResults.successIps || []).length" />
                        </a-col>
                        <a-col :span="8">
                          <a-statistic title="失败" :value="(surveyResults.failIps || []).length" />
                        </a-col>
                      </a-row>
                      <a-table
                        size="small"
                        :pagination="false"
                        :data-source="liveProbeRows"
                        :columns="liveColumns"
                        row-key="address"
                      />
                    </a-tab-pane>
                    <a-tab-pane key="port" :tab="`端口扫描 (${(surveyResults.portScanResults || []).length})`">
                      <a-table
                        size="small"
                        :pagination="{ pageSize: 10 }"
                        :data-source="surveyResults.portScanResults || []"
                        :columns="portColumns"
                        row-key="ip"
                      />
                    </a-tab-pane>
                    <a-tab-pane key="vuln" :tab="`漏洞扫描 (${(surveyResults.vulnerabilities || []).length})`">
                      <a-table
                        size="small"
                        :pagination="{ pageSize: 10 }"
                        :data-source="surveyResults.vulnerabilities || []"
                        :columns="vulnColumns"
                        :row-key="vulnRowKey"
                      />
                    </a-tab-pane>
                  </a-tabs>
                </template>
              </a-spin>
            </a-tab-pane>

            <a-tab-pane key="verify" tab="验证子任务">
              <sub-task-table :rows="workspace.verifySubs" dual-scan />
            </a-tab-pane>

            <a-tab-pane key="merge" tab="合并与状态">
              <a-descriptions bordered size="small" :column="2">
                <a-descriptions-item label="crossScan">{{ workspace.task.crossScan }}</a-descriptions-item>
                <a-descriptions-item label="verifyMergeStrategy">{{ workspace.task.verifyMergeStrategy }}</a-descriptions-item>
                <a-descriptions-item label="scanTemplateId">{{ workspace.task.scanTemplateId }}</a-descriptions-item>
                <a-descriptions-item label="taskPhase">{{ workspace.task.taskPhase }}</a-descriptions-item>
              </a-descriptions>
              <div class="section-label" style="margin-top: 16px;">实例状态分布</div>
              <div class="stat-row">
                <div v-for="(count, stat) in workspace.instanceStatCounts || {}" :key="stat" class="stat-item">
                  <div class="num">{{ count }}</div>
                  <div class="lbl">stat={{ stat }}</div>
                </div>
              </div>
            </a-tab-pane>

            <a-tab-pane key="lifecycle" tab="漏洞实例">
              <a-table
                size="small"
                row-key="vulInfoId"
                :columns="instanceColumns"
                :data-source="workspace.instances || []"
                :pagination="false"
              >
                <span slot="vulInfoStat" slot-scope="text">{{ text }}</span>
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="callback" tab="Partner 回调">
              <a-table
                size="small"
                row-key="deliveryId"
                :columns="webhookColumns"
                :data-source="workspace.webhookDeliveries || []"
                :pagination="false"
              >
                <span slot="eventType" slot-scope="text">
                  <enum-tag type="webhookEventType" :value="text" />
                </span>
                <span slot="status" slot-scope="text">
                  <enum-tag type="webhookDeliveryStatus" :value="text" />
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
import { getOpenTaskWorkspace, getOpenTaskSurveyResults, retryOpenTaskDispatch } from '@/api/openPlatform/openTask'

const SubTaskTable = {
  name: 'SubTaskTable',
  props: {
    rows: { type: Array, default: () => [] },
    dualScan: { type: Boolean, default: false },
    showRetry: { type: Boolean, default: false }
  },
  methods: {
    canRetrySub (row) {
      return row && row.status === 'FAILED' && !row.centerPlanId
    }
  },
  render (h) {
    const self = this
    const cols = [
      { title: 'subId', dataIndex: 'subId', customRender: t => h('code', t) },
      { title: '扫描器', dataIndex: 'scannerLabel' },
      { title: 'scannerType', dataIndex: 'scannerType', width: 90 },
      { title: 'taskType', dataIndex: 'centerTaskType', width: 80 },
      { title: 'planId', dataIndex: 'centerPlanId', customRender: t => h('code', t || '-') },
      { title: 'surveyId', dataIndex: 'surveyId', customRender: t => h('code', t || '-') },
      { title: '状态', dataIndex: 'status', width: 90 },
      { title: '进度', dataIndex: 'progress', width: 70 },
      { title: '错误', dataIndex: 'errorMessage', ellipsis: true }
    ]
    if (this.showRetry) {
      cols.push({
        title: '操作',
        key: 'action',
        width: 90,
        customRender: (text, row) => {
          if (!self.canRetrySub(row)) {
            return h('span', { class: 'muted' }, '-')
          }
          return h('a', {
            on: {
              click: () => self.$emit('retry-sub', row.subId)
            }
          }, '重试')
        }
      })
    }
    if (!this.rows || !this.rows.length) {
      return h('a-empty', { props: { description: '暂无子任务' } })
    }
    if (this.dualScan && this.rows.length > 1) {
      return h('div', { class: 'dual-scan-grid' }, this.rows.map(row => h('div', { class: 'scan-node', key: row.subId }, [
        h('h4', `${row.scannerLabel} · ${row.status}`),
        h('div', { class: 'kv' }, [h('span', 'surveyId'), h('code', row.surveyId || '-')]),
        h('a-progress', { props: { percent: row.progress || 0, size: 'small' } })
      ])))
    }
    return h('a-table', {
      props: { size: 'small', rowKey: 'subId', columns: cols, dataSource: this.rows, pagination: false }
    })
  }
}

const instanceColumns = [
  { title: 'vulInfoId', dataIndex: 'vulInfoId', customRender: t => t },
  { title: '资产', dataIndex: 'address' },
  { title: '端口', dataIndex: 'port', width: 72 },
  { title: '漏洞', dataIndex: 'vulnName', ellipsis: true },
  { title: '等级', dataIndex: 'level', width: 64 },
  { title: 'vulInfoStat', dataIndex: 'vulInfoStat', scopedSlots: { customRender: 'vulInfoStat' }, width: 90 }
]

const webhookColumns = [
  { title: 'deliveryId', dataIndex: 'deliveryId', ellipsis: true },
  { title: 'eventType', dataIndex: 'eventType', scopedSlots: { customRender: 'eventType' } },
  { title: 'status', dataIndex: 'status', scopedSlots: { customRender: 'status' } },
  { title: 'httpStatus', dataIndex: 'httpStatus', width: 90 },
  { title: 'createdAt', dataIndex: 'createdAt', width: 170 }
]

const liveColumns = [
  { title: 'address', dataIndex: 'address' },
  { title: 'alive', dataIndex: 'alive', width: 80 }
]

const portColumns = [
  { title: 'ip', dataIndex: 'ip', width: 120 },
  { title: 'osName', dataIndex: 'osName', width: 100 },
  { title: 'portInfo', dataIndex: 'portInfoArray', customRender: (t) => (t && t.length) ? `${t.length} 个端口` : '-' }
]

const vulnColumns = [
  { title: 'ip', dataIndex: 'ip', width: 110 },
  { title: 'port', dataIndex: 'port', width: 64 },
  { title: 'vulnName', dataIndex: 'vulnName', ellipsis: true },
  { title: 'cve', dataIndex: 'cve', width: 130 },
  { title: 'level', dataIndex: 'level', width: 80 },
  { title: 'classify', dataIndex: 'classify', width: 72 }
]

export default {
  name: 'OpenTaskWorkspace',
  components: { EnumTag, SubTaskTable },
  data () {
    return {
      loading: false,
      workspace: null,
      activeTab: 'overview',
      instanceColumns,
      webhookColumns,
      liveColumns,
      portColumns,
      vulnColumns,
      surveyLoading: false,
      surveyResults: null,
      surveySubId: undefined,
      retryLoading: false
    }
  },
  computed: {
    canRetrySurvey () {
      const task = this.workspace && this.workspace.task
      if (!task || task.adapterMode !== 'task-center') return false
      if (task.status === 'DISPATCH_FAILED' || task.status === 'ACCEPTED') return true
      const subs = (this.workspace && this.workspace.surveySubs) || []
      return subs.some(s => s.status === 'FAILED' && !s.centerPlanId)
    },
    liveCount () {
      if (!this.surveyResults) return 0
      return (this.surveyResults.successIps || []).length + (this.surveyResults.failIps || []).length
    },
    liveProbeRows () {
      if (!this.surveyResults) return []
      const rows = []
      ;(this.surveyResults.successIps || []).forEach(ip => {
        rows.push({ address: ip, alive: true })
      })
      ;(this.surveyResults.failIps || []).forEach(ip => {
        rows.push({ address: ip, alive: false })
      })
      return rows
    },
    surveyPhaseStatus () {
      const subs = (this.workspace && this.workspace.surveySubs) || []
      if (!subs.length) return '未下发'
      if (subs.every(s => s.status === 'FINISHED')) return 'FINISHED'
      if (subs.some(s => s.status === 'RUNNING')) return 'RUNNING'
      return subs.map(s => s.status).join(', ')
    },
    verifyPhaseStatus () {
      const subs = (this.workspace && this.workspace.verifySubs) || []
      if (!subs.length) {
        return this.workspace && this.workspace.task && this.workspace.task.autoVerify ? '待触发' : '不适用'
      }
      return subs.map(s => `${s.scannerLabel} ${s.progress || 0}%`).join(' · ')
    }
  },
  watch: {
    '$route.params.taskId': {
      immediate: true,
      handler (id) {
        if (id) this.loadWorkspace(id)
      }
    },
    activeTab (val) {
      if (val === 'surveyResults' && !this.surveyResults) {
        this.loadSurveyResults()
      }
    }
  },
  methods: {
    loadWorkspace (taskId) {
      this.loading = true
      this.surveyResults = null
      this.surveySubId = undefined
      getOpenTaskWorkspace(taskId)
        .then(data => {
          this.workspace = data
          const subs = (data && data.surveySubs) || []
          if (subs.length) {
            this.surveySubId = subs[0].subId
          }
        })
        .catch(err => {
          this.$message.error((err && err.message) || '加载工作台失败')
        })
        .finally(() => { this.loading = false })
    },
    loadSurveyResults () {
      const taskId = this.$route.params.taskId
      if (!taskId) return
      this.surveyLoading = true
      getOpenTaskSurveyResults(taskId, { scanPhase: 1, subId: this.surveySubId })
        .then(data => { this.surveyResults = data })
        .catch(err => {
          this.$message.error((err && err.message) || '加载排查结果失败')
        })
        .finally(() => { this.surveyLoading = false })
    },
    retrySurveyDispatch (subId) {
      const taskId = this.$route.params.taskId
      if (!taskId) return
      this.retryLoading = true
      retryOpenTaskDispatch(taskId, { scanPhase: 1, subId: subId || undefined })
        .then(data => {
          const ok = data && data.success
          const msg = (data && data.message) || (ok ? '重试下发成功' : '重试下发失败，请稍后重试')
          this.$message[ok ? 'success' : 'warning'](msg)
          this.loadWorkspace(taskId)
        })
        .catch(() => {
          this.$message.error('重试下发失败，请稍后重试或联系平台运维')
        })
        .finally(() => { this.retryLoading = false })
    },
    vulnRowKey (row, index) {
      return `${row.ip || ''}-${row.port || ''}-${row.vulId || index}`
    },
    phaseClass (phase) {
      const task = this.workspace && this.workspace.task
      if (!task) return 'pending'
      if (phase === 'survey') {
        return task.taskPhase >= 1 ? (task.taskPhase > 1 ? 'done' : 'active') : 'pending'
      }
      if (!task.autoVerify) return 'pending'
      return task.taskPhase === 2 ? 'active' : (task.status === 'FINISHED' ? 'done' : 'pending')
    },
    timelineColor (state) {
      if (state === 'done') return 'green'
      if (state === 'active') return 'blue'
      return 'gray'
    },
    formatDateTime (value) {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return value
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
  }
}
</script>

<style scoped>
.open-task-workspace-page {
  background: #f0f2f5;
}
.workspace-header-card {
  margin-bottom: 16px;
}
.workspace-title {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.workspace-meta {
  margin-top: 10px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  line-height: 1.8;
}
.phase-banner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.phase-box {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 16px;
}
.phase-box.active {
  border-color: #91d5ff;
  background: #e6f7ff;
}
.phase-box.done {
  border-color: #b7eb8f;
  background: #f6ffed;
}
.phase-box.pending {
  opacity: 0.6;
}
.phase-box h4 {
  margin-bottom: 10px;
  font-size: 13px;
}
.phase-arrow {
  display: flex;
  align-items: center;
  font-size: 20px;
  color: rgba(0, 0, 0, 0.25);
}
.kv {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  line-height: 1.8;
}
.kv.warn span:last-child {
  color: #d46b08;
}
.section-label {
  font-weight: 500;
  margin-bottom: 12px;
}
.timeline-at {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.stat-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.stat-item {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 12px 20px;
  background: #fafafa;
  text-align: center;
}
.stat-item .num {
  font-size: 22px;
  font-weight: 600;
}
.stat-item .lbl {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.survey-results-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.survey-results-toolbar .api-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-family: Consolas, monospace;
  margin-left: auto;
}
.survey-retry-toolbar {
  margin-bottom: 12px;
}
.survey-retry-toolbar .api-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-family: Consolas, monospace;
  margin-left: 12px;
}
.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>

<style>
.dual-scan-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.scan-node {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 16px;
  background: #fafafa;
}
.scan-node h4 {
  margin-bottom: 8px;
}
</style>

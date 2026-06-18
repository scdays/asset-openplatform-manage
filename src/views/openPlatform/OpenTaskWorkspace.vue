<template>
  <div class="p_16 open-task-workspace-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenTaskList' })">OPEN 编排任务</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>任务实例工作台</a-breadcrumb-item>
    </a-breadcrumb>

    <a-spin :spinning="loading || refreshing">
      <template v-if="workspace && workspace.task">
        <a-card :bordered="false" class="workspace-header-card">
          <div class="workspace-header-row">
            <div class="workspace-header-main">
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
            </div>
            <div class="workspace-header-actions">
              <a-button :loading="refreshing" @click="handleRefreshClick">
                <a-icon type="reload" />
                刷新
              </a-button>
              <span v-if="lastRefreshedAt" class="refresh-at">更新于 {{ lastRefreshedAt }}</span>
            </div>
          </div>
        </a-card>

        <div class="phase-banner">
          <div class="phase-box" :class="phaseClass('survey')">
            <h4><a-tag color="green">阶段1</a-tag> 排查 · scan_phase=1</h4>
            <div class="kv"><span>子任务</span><span>{{ (workspace.surveySubs || []).length }} 个</span></div>
            <div class="kv"><span>状态</span><span>{{ surveyPhaseStatus }}</span></div>
            <div class="kv"><span>实例</span><span>{{ workspace.task.instanceCount || 0 }} 条</span></div>
            <div v-if="workspace.task.crossScan" class="kv warn">
              <span>交叉</span><span>排查双扫完成后合并，不二次下发</span>
            </div>
            <div v-else-if="workspace.task.autoVerify" class="kv warn">
              <span>回调</span><span>已推迟（autoVerify=true）</span>
            </div>
          </div>
          <div class="phase-arrow">→</div>
          <div class="phase-box" :class="phaseClass('verify')">
            <h4>
              <a-tag color="blue">{{ workspace.task.crossScan ? '交叉合并' : '阶段2' }}</a-tag>
              {{ workspace.task.crossScan ? '双扫结果合并' : '验证 · scan_phase=2' }}
            </h4>
            <div v-if="workspace.task.crossScan" class="kv">
              <span>策略</span><span>{{ workspace.task.verifyMergeStrategy || '-' }}</span>
            </div>
            <template v-else>
              <div class="kv"><span>子任务</span><span>{{ (workspace.verifySubs || []).length }} 个</span></div>
              <div class="kv"><span>合并</span><span>{{ workspace.task.verifyMergeStrategy || '-' }}</span></div>
              <div class="kv"><span>进度</span><span>{{ verifyPhaseStatus }}</span></div>
            </template>
          </div>
        </div>

        <a-card :bordered="false">
          <a-tabs v-model="activeTab" @change="onTabChange">
            <div slot="tabBarExtraContent" class="tab-bar-extra">
              <span class="tab-extra-hint">切换页签自动刷新</span>
            </div>
            <a-tab-pane key="overview" tab="概览">
              <a-alert
                v-if="workspace.task.crossScan"
                type="info"
                show-icon
                message="交叉扫描（scanTemplateId=1001）：绿盟 + Nessus 各下发一次排查；全部完成后基于排查结果交叉合并，任务 FINISHED 时触发 TASK_COMPLETED 回调与导出。"
                style="margin-bottom: 16px;"
              />
              <a-alert
                v-else-if="workspace.task.autoVerify"
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
                :show-refetch="canRefetchSurvey"
                :refetch-loading-sub-id="refetchLoadingSubId"
                @retry-sub="retrySurveyDispatch"
                @refetch-sub="refetchSurveyResults"
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
                <a-button :loading="surveyLoading" @click="loadSurveyResults">刷新排查结果</a-button>
                <span class="api-hint">GET /internal/admin/open-tasks/{taskId}/survey-results</span>
              </div>
              <a-alert
                v-if="surveyResults && surveyResults.hint"
                :type="hasSurveyResultTabs ? 'info' : 'warning'"
                show-icon
                :message="surveyResults.hint"
                style="margin: 12px 0;"
              />
              <a-spin :spinning="surveyLoading">
                <template v-if="hasSurveyResultTabs">
                  <a-descriptions
                    v-if="surveyResults"
                    bordered
                    size="small"
                    :column="4"
                    style="margin-bottom: 12px;"
                  >
                    <a-descriptions-item label="扫描器">{{ surveyResults.scannerLabel || '-' }}</a-descriptions-item>
                    <a-descriptions-item label="surveyId">
                      <code>{{ surveyResults.surveyId || '-' }}</code>
                    </a-descriptions-item>
                    <a-descriptions-item label="数据来源">{{ surveyResults.source || '-' }}</a-descriptions-item>
                    <a-descriptions-item label="子任务">{{ surveyResults.subId || '-' }}</a-descriptions-item>
                  </a-descriptions>
                  <a-tabs size="small" default-active-key="live">
                    <a-tab-pane key="live" :tab="`存活探测 (${liveProbeTableRows.length})`">
                      <a-row :gutter="16" style="margin-bottom: 12px;">
                        <a-col :span="6">
                          <a-statistic title="存活" :value="(surveyResults.successIps || []).length" />
                        </a-col>
                        <a-col :span="6">
                          <a-statistic title="失败" :value="(surveyResults.failIps || []).length" />
                        </a-col>
                        <a-col :span="6">
                          <a-statistic title="明细行" :value="liveProbeTableRows.length" />
                        </a-col>
                      </a-row>
                      <a-table
                        size="small"
                        :pagination="surveyTablePagination"
                        :scroll="{ x: 960 }"
                        :data-source="liveProbeTableRows"
                        :columns="liveColumns"
                        :row-key="liveRowKey"
                      />
                    </a-tab-pane>
                    <a-tab-pane key="port" :tab="`端口扫描 (${portDetailRows.length})`">
                      <a-table
                        size="small"
                        :pagination="surveyTablePagination"
                        :scroll="{ x: 1100 }"
                        :data-source="portDetailRows"
                        :columns="portColumns"
                        :row-key="portRowKey"
                      />
                    </a-tab-pane>
                    <a-tab-pane key="vuln" :tab="`系统漏洞 (${(surveyResults.vulnerabilities || []).length})`">
                      <a-table
                        size="small"
                        :pagination="surveyTablePagination"
                        :scroll="{ x: 1400 }"
                        :data-source="surveyResults.vulnerabilities || []"
                        :columns="vulnColumns"
                        :row-key="vulnRowKey"
                      />
                    </a-tab-pane>
                    <a-tab-pane
                      v-if="(surveyResults.vulnDatabaseList || []).length"
                      key="vulnDb"
                      :tab="`漏洞库 (${(surveyResults.vulnDatabaseList || []).length})`"
                    >
                      <a-table
                        size="small"
                        :pagination="surveyTablePagination"
                        :scroll="{ x: 1200 }"
                        :data-source="surveyResults.vulnDatabaseList || []"
                        :columns="vulnDbColumns"
                        :row-key="vulnDbRowKey"
                      />
                    </a-tab-pane>
                  </a-tabs>
                </template>
              </a-spin>
            </a-tab-pane>

            <a-tab-pane key="verify" :tab="workspace.task.crossScan ? '交叉合并说明' : '验证子任务'">
              <a-alert
                v-if="workspace.task.crossScan"
                type="info"
                show-icon
                message="交叉扫描不再下发验证阶段 VTC 任务；合并策略见 scanTemplateId 对应 verifyMergeStrategy（1001 默认 UNION）。"
                style="margin-bottom: 12px;"
              />
              <sub-task-table v-if="!workspace.task.crossScan" :rows="workspace.verifySubs" dual-scan />
              <a-empty v-else description="交叉合并在排查双扫全部 FINISHED 时自动完成" />
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
import { getOpenTaskWorkspace, getOpenTaskSurveyResults, retryOpenTaskDispatch, refetchOpenTaskSurveyResults } from '@/api/openPlatform/openTask'

const SubTaskTable = {
  name: 'SubTaskTable',
  props: {
    rows: { type: Array, default: () => [] },
    dualScan: { type: Boolean, default: false },
    showRetry: { type: Boolean, default: false },
    showRefetch: { type: Boolean, default: false },
    refetchLoadingSubId: { type: String, default: '' }
  },
  methods: {
    canRetrySub (row) {
      return row && row.status === 'FAILED' && !row.centerPlanId
    },
    canRefetchSub (row) {
      return row && row.surveyId && row.status === 'FINISHED'
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
    if (this.showRetry || this.showRefetch) {
      cols.push({
        title: '操作',
        key: 'action',
        width: 140,
        customRender: (text, row) => {
          const actions = []
          if (self.showRetry && self.canRetrySub(row)) {
            actions.push(h('a', {
              on: { click: () => self.$emit('retry-sub', row.subId) }
            }, '重试'))
          }
          if (self.showRefetch && self.canRefetchSub(row)) {
            if (actions.length) {
              actions.push(h('span', { class: 'muted', style: { margin: '0 6px' } }, '|'))
            }
            const loading = self.refetchLoadingSubId === row.subId
            actions.push(h('a', {
              attrs: { disabled: loading ? 'disabled' : null },
              on: { click: () => !loading && self.$emit('refetch-sub', row.subId) }
            }, loading ? '获取中…' : '重新获取'))
          }
          if (!actions.length) {
            return h('span', { class: 'muted' }, '-')
          }
          return h('span', actions)
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

const surveyCell = (text) => (text === undefined || text === null || text === '' ? '-' : String(text))

const surveyEllipsis = (text, max = 48) => {
  const s = surveyCell(text)
  if (s === '-' || s.length <= max) return s
  return s.slice(0, max) + '…'
}

const levelLabel = (level) => {
  if (!level) return '-'
  const map = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
    info: '信息'
  }
  return map[String(level).toLowerCase()] || level
}

const liveColumns = [
  { title: '地址', dataIndex: 'address', width: 130, fixed: 'left' },
  { title: '存活', dataIndex: 'alive', width: 72, customRender: t => (t === true || t === 'true' ? '是' : (t === false || t === 'false' ? '否' : surveyCell(t))) },
  { title: '探测方式', dataIndex: 'probeMethod', width: 88 },
  { title: '时延(ms)', dataIndex: 'latencyMs', width: 88 },
  { title: 'MAC', dataIndex: 'mac', width: 130, ellipsis: true },
  { title: 'OS 猜测', dataIndex: 'osGuess', width: 120, ellipsis: true },
  { title: '探测时间', dataIndex: 'detectedAt', width: 170 },
  { title: 'targetId', dataIndex: 'targetId', width: 110, ellipsis: true },
  { title: 'liveProbeId', dataIndex: 'liveProbeId', width: 150, ellipsis: true }
]

const portColumns = [
  { title: 'IP', dataIndex: 'ip', width: 120, fixed: 'left' },
  { title: '端口', dataIndex: 'port', width: 72 },
  { title: '协议', dataIndex: 'protocol', width: 72 },
  { title: '状态', dataIndex: 'state', width: 88 },
  { title: '服务', dataIndex: 'service', width: 100, ellipsis: true },
  { title: '版本', dataIndex: 'version', width: 120, ellipsis: true },
  { title: 'Banner', dataIndex: 'banner', ellipsis: true, customRender: t => surveyEllipsis(t, 64) },
  { title: 'OS', dataIndex: 'osName', width: 100, ellipsis: true }
]

const vulnColumns = [
  { title: 'IP', dataIndex: 'ip', width: 120, fixed: 'left' },
  { title: '端口', dataIndex: 'port', width: 64 },
  { title: '协议', dataIndex: 'protocol', width: 72 },
  { title: '服务', dataIndex: 'service', width: 88, ellipsis: true },
  { title: '漏洞名称', dataIndex: 'vulnName', width: 200, ellipsis: true },
  { title: '等级', dataIndex: 'level', width: 72, customRender: t => levelLabel(t) },
  { title: 'CVE', dataIndex: 'cve', width: 130, ellipsis: true },
  { title: '厂商漏洞ID', dataIndex: 'vulId', width: 100 },
  { title: '扫描器', dataIndex: 'classify', width: 80 },
  { title: '服务版本/详情', dataIndex: 'serviceVersion', width: 200, ellipsis: true, customRender: t => surveyEllipsis(t, 80) }
]

const vulnDbColumns = [
  { title: '厂商漏洞ID', dataIndex: 'vulId', width: 100, fixed: 'left' },
  { title: '漏洞名称', dataIndex: 'vulnName', width: 200, ellipsis: true },
  { title: '等级', dataIndex: 'level', width: 72, customRender: t => levelLabel(t) },
  { title: 'CVE', dataIndex: 'cve', width: 130, ellipsis: true },
  { title: '扫描器', dataIndex: 'classify', width: 80 },
  { title: '描述', dataIndex: 'description', ellipsis: true, customRender: t => surveyEllipsis(t, 100) },
  { title: '修复建议', dataIndex: 'solution', ellipsis: true, customRender: t => surveyEllipsis(t, 100) },
  { title: '摘要', dataIndex: 'messString', width: 160, ellipsis: true }
]

export default {
  name: 'OpenTaskWorkspace',
  components: { EnumTag, SubTaskTable },
  data () {
    return {
      loading: false,
      refreshing: false,
      lastRefreshedAt: '',
      workspace: null,
      activeTab: 'overview',
      instanceColumns,
      webhookColumns,
      liveColumns,
      portColumns,
      vulnColumns,
      vulnDbColumns,
      surveyTablePagination: {
        pageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: total => `共 ${total} 条`
      },
      surveyLoading: false,
      surveyResults: null,
      surveySubId: undefined,
      retryLoading: false,
      refetchLoadingSubId: ''
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
    canRefetchSurvey () {
      const task = this.workspace && this.workspace.task
      return task && task.adapterMode === 'task-center' && (task.taskPhase == null || task.taskPhase <= 1)
    },
    hasSurveyResultTabs () {
      const src = this.surveyResults && this.surveyResults.source
      return src === 'persisted' || src === 'task-center'
    },
    liveProbeTableRows () {
      if (!this.surveyResults) return []
      const detailed = this.surveyResults.liveProbeResults || []
      if (detailed.length) return detailed
      return this.liveProbeRowsFallback
    },
    liveProbeRowsFallback () {
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
    portDetailRows () {
      if (!this.surveyResults) return []
      const flat = []
      ;(this.surveyResults.portScanResults || []).forEach(host => {
        if (!host) return
        const ip = host.ip
        const osName = host.osName
        const ports = host.portInfoArray || []
        if (!ports.length) {
          flat.push({ ip, osName, port: '-', protocol: '-', state: '-', service: '-', version: '-', banner: '-' })
          return
        }
        ports.forEach((p, idx) => {
          flat.push({
            ip,
            osName: osName || p.osName,
            port: p.port,
            protocol: p.protocol,
            state: p.state,
            service: p.service,
            version: p.version,
            banner: p.banner,
            _idx: idx
          })
        })
      })
      return flat
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
    }
  },
  methods: {
    onTabChange (tabKey) {
      this.refreshWorkspaceData(tabKey)
    },
    handleRefreshClick () {
      this.refreshWorkspaceData()
    },
    markRefreshed () {
      this.lastRefreshedAt = this.formatDateTime(new Date())
    },
    refreshWorkspaceData (tabKey) {
      const taskId = this.$route.params.taskId
      if (!taskId) return
      const activeTab = typeof tabKey === 'string' ? tabKey : this.activeTab
      const prevSurveySubId = this.surveySubId
      this.refreshing = true
      getOpenTaskWorkspace(taskId)
        .then(data => {
          this.workspace = data
          const subs = (data && data.surveySubs) || []
          if (prevSurveySubId && subs.some(s => s.subId === prevSurveySubId)) {
            this.surveySubId = prevSurveySubId
          } else if (subs.length) {
            this.surveySubId = subs[0].subId
          }
          this.markRefreshed()
          if (activeTab === 'surveyResults') {
            return this.loadSurveyResults({ keepLoading: true })
          }
        })
        .catch(err => {
          this.$message.error((err && err.message) || '刷新工作台失败')
        })
        .finally(() => {
          this.refreshing = false
        })
    },
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
          this.markRefreshed()
        })
        .catch(err => {
          this.$message.error((err && err.message) || '加载工作台失败')
        })
        .finally(() => { this.loading = false })
    },
    loadSurveyResults (options = {}) {
      const taskId = this.$route.params.taskId
      if (!taskId) return Promise.resolve()
      if (!options.keepLoading) {
        this.surveyLoading = true
      }
      return getOpenTaskSurveyResults(taskId, { scanPhase: 1, subId: this.surveySubId })
        .then(data => { this.surveyResults = data })
        .catch(err => {
          this.$message.error((err && err.message) || '加载排查结果失败')
        })
        .finally(() => {
          if (!options.keepLoading) {
            this.surveyLoading = false
          }
        })
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
          this.refreshWorkspaceData('survey')
        })
        .catch(() => {
          this.$message.error('重试下发失败，请稍后重试或联系平台运维')
        })
        .finally(() => { this.retryLoading = false })
    },
    refetchSurveyResults (subId) {
      const taskId = this.$route.params.taskId
      if (!taskId || !subId) return
      this.refetchLoadingSubId = subId
      refetchOpenTaskSurveyResults(taskId, subId)
        .then(data => {
          const ok = data && data.success
          this.$message[ok ? 'success' : 'warning']((data && data.message) || '重新获取完成')
          this.surveySubId = subId
          this.refreshWorkspaceData('surveyResults')
        })
        .catch(err => {
          this.$message.error((err && err.message) || '重新获取失败')
        })
        .finally(() => { this.refetchLoadingSubId = '' })
    },
    vulnRowKey (row, index) {
      return row.id || `${row.ip || ''}-${row.port || ''}-${row.vulId || ''}-${index}`
    },
    liveRowKey (row, index) {
      return row.liveProbeId || `${row.address || ''}-${row.alive}-${index}`
    },
    portRowKey (row, index) {
      return `${row.ip || ''}-${row.port || ''}-${row.protocol || ''}-${row._idx != null ? row._idx : index}`
    },
    vulnDbRowKey (row, index) {
      return row.id || `${row.classify || ''}-${row.vulId || ''}-${index}`
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
.workspace-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.workspace-header-main {
  flex: 1;
  min-width: 280px;
}
.workspace-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.refresh-at {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}
.tab-bar-extra {
  margin-right: 4px;
}
.tab-extra-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
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

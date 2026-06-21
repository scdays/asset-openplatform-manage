<template>
  <div class="p_16 verify-fix-workspace-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'VerifyFixJobList' })">修复核验</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>工作台</a-breadcrumb-item>
    </a-breadcrumb>

    <a-spin :spinning="loading">
      <template v-if="workspace && workspace.job">
        <a-card :bordered="false" class="workspace-header-card">
          <div class="workspace-header-row">
            <div class="workspace-header-main">
              <div class="workspace-title">
                修复核验
                <a-tag :color="statusColor(workspace.job.status)">{{ workspace.job.status }}</a-tag>
                <span v-if="workspace.job.progress != null" class="progress-tag">{{ workspace.job.progress }}%</span>
              </div>
              <div class="workspace-meta">
                jobId <code>{{ workspace.job.jobId }}</code>
                · partner <code>{{ workspace.job.partnerId }}</code>
                · 条数 {{ workspace.job.itemCount || 0 }}
                · 复扫 sub {{ (workspace.rescanSubs || []).length }}
                <template v-if="workspace.job.retryCount > 0">
                  · 自动重试 <span :class="{ 'retry-warn': workspace.job.retryCount >= 5 }">{{ workspace.job.retryCount }}/5</span>
                </template>
                <template v-if="workspace.job.caseId">
                  · case <a @click="goCase(workspace.job.caseId)"><code>{{ workspace.job.caseId }}</code></a>
                </template>
              </div>
              <div v-if="workspace.job.status === 'DISPATCH_FAILED'" class="retry-hint">
                <a-alert type="warning" show-icon :message="retryHintMessage" banner />
              </div>
            </div>
            <div class="workspace-header-actions">
              <a-button :loading="loading" @click="loadWorkspace">
                <a-icon type="reload" />
                刷新
              </a-button>
            </div>
          </div>
          <div v-if="(workspace.constraints || []).length" class="constraint-row">
            <a-alert type="info" show-icon>
              <template slot="message">修复核验约束</template>
              <template slot="description">
                <div v-for="(line, idx) in workspace.constraints" :key="idx">{{ line }}</div>
              </template>
            </a-alert>
          </div>
        </a-card>

        <div class="phase-banner">
          <div class="phase-box phase-active">
            <h4><a-tag color="cyan">phase=3</a-tag> 修复核验复扫</h4>
            <div class="kv"><span>子任务</span><span>{{ (workspace.rescanSubs || []).length }} 个</span></div>
            <div class="kv"><span>条目</span><span>{{ workspace.job.itemCount || 0 }} 条</span></div>
            <div class="kv"><span>状态</span><span>{{ workspace.job.status }}</span></div>
          </div>
        </div>

        <a-card :bordered="false">
          <a-tabs v-model="activeTab" @change="onTabChange">
            <a-tab-pane key="overview" tab="概览">
              <div class="section-label">结果分布</div>
              <div class="stat-row">
                <div v-for="(count, stat) in workspace.itemResultCounts || {}" :key="'r'+stat" class="stat-item">
                  <div class="num">{{ count }}</div>
                  <div class="lbl">结果 stat={{ stat }}</div>
                </div>
                <div v-for="(count, st) in workspace.itemStatCounts || {}" :key="'s'+st" class="stat-item">
                  <div class="num">{{ count }}</div>
                  <div class="lbl">项 {{ st }}</div>
                </div>
              </div>
              <div class="section-label" style="margin-top: 16px;">全链路时序</div>
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

            <a-tab-pane key="subs" tab="复扫子任务">
              <div v-if="canRetryRescan" class="survey-retry-toolbar">
                <a-alert
                  type="warning"
                  show-icon
                  message="存在复扫子任务下发失败，可手动重试向 vuln-task-center 下发 SOC 扫描。"
                  style="margin-bottom: 12px;"
                />
                <a-button
                  type="primary"
                  :loading="retrying"
                  @click="retryDispatch()"
                >
                  重试全部复扫下发
                </a-button>
                <span class="api-hint">POST /internal/admin/verify-fix/jobs/{jobId}/retry-dispatch</span>
              </div>
              <a-table
                size="small"
                row-key="subId"
                :columns="subColumns"
                :data-source="workspace.rescanSubs || []"
                :pagination="false"
              >
                <span slot="scannerType" slot-scope="text, record">
                  {{ record.scannerLabel || scannerLabel(text) }}
                </span>
                <span slot="scanPhase" slot-scope="text">{{ text === 3 ? '修复核验(3)' : text }}</span>
                <span slot="subStatus" slot-scope="text">
                  <a-tag :color="subStatusColor(text)">{{ text || '-' }}</a-tag>
                </span>
                <span slot="subError" slot-scope="text">
                  <a-tooltip v-if="text" :title="text">
                    <span class="sub-error-text">{{ text }}</span>
                  </a-tooltip>
                  <span v-else class="muted">-</span>
                </span>
                <span slot="reportPath" slot-scope="text">
                  <code v-if="text" class="path-code">{{ text }}</code>
                  <span v-else class="muted">-</span>
                </span>
                <span slot="subAction" slot-scope="text, record">
                  <a
                    v-if="canRefetchSub(record)"
                    :disabled="refetchLoadingSubId === record.subId"
                    @click="refetchRescanSub(record.subId)"
                  >{{ refetchLoadingSubId === record.subId ? '获取中…' : '重取结果' }}</a>
                  <a-tooltip v-else-if="canRetrySub(record)" title="仅重新下发该子任务">
                    <a
                      :disabled="retryingSubId === record.subId"
                      @click="retryDispatchSub(record.subId)"
                    >{{ retryingSubId === record.subId ? '重试中…' : '重试下发' }}</a>
                  </a-tooltip>
                  <span v-else class="muted">-</span>
                </span>
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="items" tab="待核验实例">
              <a-table
                size="small"
                row-key="vulInfoId"
                :columns="itemColumns"
                :data-source="workspace.job.items || []"
                :pagination="{ pageSize: 20 }"
              >
                <span slot="previousStat" slot-scope="text">
                  <enum-tag v-if="text != null && text !== ''" type="vulInfoStat" :value="text" with-code />
                  <span v-else>-</span>
                </span>
                <span slot="resultStat" slot-scope="text">
                  <enum-tag v-if="text != null && text !== ''" type="vulInfoStat" :value="text" with-code />
                  <span v-else>-</span>
                </span>
                <span slot="scannerType" slot-scope="text">{{ scannerLabel(text) }}</span>
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="rescanResults" tab="复扫结果">
              <div class="survey-toolbar">
                <a-select
                  v-model="surveySubId"
                  placeholder="选择复扫 sub"
                  style="width: 280px; margin-right: 8px;"
                  allow-clear
                  @change="loadSurveyResults"
                >
                  <a-select-option
                    v-for="sub in workspace.rescanSubs || []"
                    :key="sub.subId"
                    :value="sub.subId"
                  >
                    {{ sub.scannerLabel }} · {{ sub.status }} · {{ sub.surveyId || '无 surveyId' }}
                  </a-select-option>
                </a-select>
                <a-button :loading="surveyLoading" @click="loadSurveyResults">刷新</a-button>
                <span class="api-hint">GET survey-results?scanPhase=3</span>
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
                  <a-tabs size="small" default-active-key="vuln">
                    <a-tab-pane key="live" :tab="`存活探测 (${liveProbeTableRows.length})`">
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
                        :columns="rescanVulnColumns"
                        :row-key="vulnRowKey"
                      />
                    </a-tab-pane>
                  </a-tabs>
                </template>
                <a-empty v-else description="选择已完成复扫的 sub 查看漏洞明细" />
              </a-spin>
            </a-tab-pane>

            <a-tab-pane key="exports" tab="外发与回调">
              <div class="section-label">VERIFY_FIX_SCAN 外发</div>
              <a-table
                size="small"
                row-key="exportId"
                :columns="exportColumns"
                :data-source="workspace.exports || []"
                :pagination="false"
                style="margin-bottom: 16px;"
              />
              <div class="section-label">Webhook</div>
              <a-table
                size="small"
                row-key="deliveryId"
                :columns="webhookColumns"
                :data-source="workspace.webhookDeliveries || []"
                :pagination="false"
              >
                <span slot="eventType" slot-scope="text">
                  <enum-tag v-if="text" type="webhookEventType" :value="text" />
                  <span v-else>-</span>
                </span>
              </a-table>
            </a-tab-pane>

            <a-tab-pane v-if="showMockPanel" key="mock" tab="Mock 完成">
              <a-alert
                type="warning"
                show-icon
                message="仅 Mock 模式：导入复扫 XML 并完成比对"
                style="margin-bottom: 12px;"
              />
              <div class="e2e-upload-row" style="margin-bottom: 12px;">
                <input ref="fileInput" type="file" accept=".xml" class="e2e-file-input" @change="onFileChange" />
                <a-button icon="upload" size="small" @click="pickFile">选择复扫 XML</a-button>
                <span v-if="xmlFileName" class="e2e-file-name">{{ xmlFileName }}</span>
              </div>
              <a-button-group>
                <a-button type="primary" size="small" :disabled="!xmlFile" :loading="completing" @click="importAndComplete">导入并完成</a-button>
                <a-button size="small" :loading="completing" @click="oneClickFixed">全部核验修复(6)</a-button>
                <a-button size="small" :loading="completing" @click="oneClickUnfixed">全部核验未修复(7)</a-button>
              </a-button-group>
            </a-tab-pane>
          </a-tabs>
        </a-card>

        <div v-if="(workspace.rescanSubs || []).length || (workspace.relatedTasks || []).length" class="related-links">
          <template v-if="(workspace.rescanSubs || []).length">
            <span class="muted">关联复扫子任务（{{ workspace.rescanSubs.length }}）：</span>
            <a-button
              v-for="sub in workspace.rescanSubs"
              :key="sub.subId"
              size="small"
              style="margin-right: 8px; margin-bottom: 4px;"
              @click="goRescanSub(sub)"
            >{{ sub.scannerLabel || scannerLabel(sub.scannerType) }} · {{ sub.subId }}</a-button>
          </template>
          <template v-if="(workspace.relatedTasks || []).length">
            <span class="muted" style="margin-left: 8px;">关联 OPEN 任务：</span>
            <a-button
              v-for="t in workspace.relatedTasks"
              :key="t.taskId"
              size="small"
              style="margin-right: 8px;"
              @click="goOpenTask(t.taskId)"
            >{{ t.taskId }}</a-button>
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="工作台数据不存在" />
    </a-spin>
  </div>
</template>

<script>
import EnumTag from '@/components/openPlatform/EnumTag'
import {
  getVerifyFixWorkspace,
  refetchVerifyFixRescanResults,
  retryVerifyFixDispatch,
  retryVerifyFixDispatchSub,
  scannerTypeLabel
} from '@/api/openPlatform/verifyFix'
import { getOpenTaskSurveyResults } from '@/api/openPlatform/openTask'
import {
  importVerifyFixRescanXml,
  completeVerifyFixAllFixed,
  completeVerifyFixAllUnfixed
} from '@/api/openPlatform/mockVerifyFix'
import { checkHealth } from '@/api/openPlatform/openPartnerApi'

const subColumns = [
  { title: 'subId', dataIndex: 'subId', ellipsis: true },
  { title: '扫描器', dataIndex: 'scannerType', scopedSlots: { customRender: 'scannerType' }, width: 110 },
  { title: '阶段', dataIndex: 'scanPhase', scopedSlots: { customRender: 'scanPhase' }, width: 100 },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'subStatus' }, width: 88 },
  { title: '进度', dataIndex: 'progress', width: 64 },
  { title: '失败原因', dataIndex: 'errorMessage', ellipsis: true, scopedSlots: { customRender: 'subError' }, width: 200 },
  { title: 'surveyId', dataIndex: 'surveyId', ellipsis: true },
  { title: '报告路径', dataIndex: 'reportDownloadPath', scopedSlots: { customRender: 'reportPath' } },
  { title: '操作', scopedSlots: { customRender: 'subAction' }, width: 150, fixed: 'right' }
]

const itemColumns = [
  { title: 'vulInfoId', dataIndex: 'vulInfoId', ellipsis: true },
  { title: 'taskId', dataIndex: 'taskId', width: 120, ellipsis: true },
  { title: '前状态', dataIndex: 'previousStat', scopedSlots: { customRender: 'previousStat' }, width: 120 },
  { title: '结果', dataIndex: 'resultStat', scopedSlots: { customRender: 'resultStat' }, width: 120 },
  { title: '扫描器', dataIndex: 'scannerType', scopedSlots: { customRender: 'scannerType' }, width: 100 },
  { title: '复扫 sub', dataIndex: 'rescanSubId', width: 110, ellipsis: true },
  { title: '项状态', dataIndex: 'itemStatus', width: 90 }
]

const exportColumns = [
  { title: 'exportId', dataIndex: 'exportId', ellipsis: true },
  { title: 'taskId', dataIndex: 'taskId', width: 120 },
  { title: 'format', dataIndex: 'format', width: 72 },
  { title: 'status', dataIndex: 'status', width: 80 },
  { title: 'downloadUrl', dataIndex: 'downloadUrl', ellipsis: true }
]

const webhookColumns = [
  { title: 'deliveryId', dataIndex: 'deliveryId', ellipsis: true },
  { title: 'eventType', dataIndex: 'eventType', scopedSlots: { customRender: 'eventType' } },
  { title: 'status', dataIndex: 'status', width: 90 },
  { title: 'httpStatus', dataIndex: 'httpStatus', width: 90 }
]

const rescanVulnColumns = [
  { title: 'IP', dataIndex: 'ip', width: 120, fixed: 'left' },
  { title: '端口', dataIndex: 'port', width: 64 },
  { title: '协议', dataIndex: 'protocol', width: 72 },
  { title: '漏洞名称', dataIndex: 'vulnName', width: 200, ellipsis: true },
  { title: '等级', dataIndex: 'level', width: 72 },
  { title: 'CVE', dataIndex: 'cve', width: 130, ellipsis: true },
  { title: '厂商漏洞ID', dataIndex: 'vulId', width: 100 },
  { title: '扫描器', dataIndex: 'classify', width: 80 }
]

const liveColumns = [
  { title: '地址', dataIndex: 'address', width: 130, fixed: 'left' },
  { title: '存活', dataIndex: 'alive', width: 72 },
  { title: '探测方式', dataIndex: 'probeMethod', width: 88 },
  { title: '时延(ms)', dataIndex: 'latencyMs', width: 88 }
]

const portColumns = [
  { title: 'IP', dataIndex: 'ip', width: 120, fixed: 'left' },
  { title: '端口', dataIndex: 'port', width: 72 },
  { title: '协议', dataIndex: 'protocol', width: 72 },
  { title: '状态', dataIndex: 'state', width: 88 },
  { title: '服务', dataIndex: 'service', width: 100, ellipsis: true }
]

export default {
  name: 'VerifyFixWorkspace',
  components: { EnumTag },
  data () {
    return {
      jobId: '',
      workspace: null,
      loading: false,
      activeTab: 'overview',
      adapterMode: '',
      subColumns,
      itemColumns,
      exportColumns,
      webhookColumns,
      rescanVulnColumns,
      liveColumns,
      portColumns,
      surveyTablePagination: {
        pageSize: 15,
        showSizeChanger: true,
        pageSizeOptions: ['10', '15', '30', '50'],
        showTotal: total => `共 ${total} 条`
      },
      surveySubId: '',
      surveyResults: null,
      surveyLoading: false,
      refetchLoadingSubId: '',
      retryingSubId: '',
      xmlFile: null,
      xmlFileName: '',
      completing: false,
      retrying: false
    }
  },
  computed: {
    showMockPanel () {
      return this.adapterMode === 'mock'
    },
    canRefetchRescan () {
      return this.adapterMode === 'task-center'
    },
    canRetryRescan () {
      if (!this.canRefetchRescan) return false
      const job = this.workspace && this.workspace.job
      if (job && job.status === 'DISPATCH_FAILED') return true
      const subs = (this.workspace && this.workspace.rescanSubs) || []
      return subs.some(s => s.status === 'FAILED')
    },
    retryHintMessage () {
      const c = (this.workspace && this.workspace.job && this.workspace.job.retryCount) || 0
      if (c >= 5) {
        return `已达自动重试上限（${c}/5），自动重试已停止，请点击「重试下发」手动介入（手动重试不受上限约束）`
      }
      return '下发失败，可点击「重试下发」手动重新下发复扫子任务'
    },
    hasSurveyResultTabs () {
      const src = this.surveyResults && this.surveyResults.source
      return src === 'persisted' || src === 'task-center'
    },
    liveProbeTableRows () {
      if (!this.surveyResults) return []
      const detailed = this.surveyResults.liveProbeResults || []
      if (detailed.length) return detailed
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
        const ports = host.portInfoArray || []
        if (!ports.length) {
          flat.push({ ip, port: '-', protocol: '-', state: '-', service: '-' })
          return
        }
        ports.forEach((p, idx) => {
          flat.push({
            ip,
            port: p.port,
            protocol: p.protocol,
            state: p.state,
            service: p.service,
            _idx: idx
          })
        })
      })
      return flat
    }
  },
  watch: {
    '$route.params.jobId': {
      immediate: true,
      handler (id) {
        const nextId = (id || '').trim()
        if (!nextId) return
        if (nextId !== this.jobId) {
          this.resetWorkspaceState()
          this.jobId = nextId
        }
        this.loadWorkspace()
      }
    }
  },
  created () {
    // adapterMode 为全局引擎配置，仅拉取一次即可，避免每次切换 jobId 与 loadWorkspace 并发导致 Mock 面板闪现
    this.loadHealth()
  },
  methods: {
    scannerLabel: scannerTypeLabel,
    resetWorkspaceState () {
      this.workspace = null
      this.surveyResults = null
      this.surveySubId = ''
      this.activeTab = 'overview'
      this.refetchLoadingSubId = ''
    },
    onTabChange (tabKey) {
      if (tabKey === 'rescanResults' && this.surveySubId) {
        this.loadSurveyResults()
      }
    },
    canRefetchSub (row) {
      return this.canRefetchRescan && row && row.surveyId && row.status === 'FINISHED'
    },
    canRetrySub (row) {
      // 复扫子任务调用 vuln-task-center 失败（sub.status=FAILED）时允许手动重试下发。
      // 该场景下 job 整体仍为 RUNNING，job 级「重试下发」按钮不会显示，故在子任务行提供入口。
      return this.canRefetchRescan && row && row.status === 'FAILED'
    },
    subStatusColor (status) {
      if (status === 'FINISHED') return 'green'
      if (status === 'FAILED') return 'red'
      if (status === 'RUNNING') return 'blue'
      return 'orange'
    },
    async refetchRescanSub (subId) {
      if (!this.jobId || !subId) return
      this.refetchLoadingSubId = subId
      try {
        const data = await refetchVerifyFixRescanResults(this.jobId, subId)
        const ok = data && data.success
        this.$message[ok ? 'success' : 'warning']((data && data.message) || '重新获取完成')
        this.surveySubId = subId
        await this.loadWorkspace()
        if (this.activeTab === 'rescanResults') {
          await this.loadSurveyResults()
        }
      } catch (e) {
        this.$message.error(e.message || '重新获取失败')
      } finally {
        this.refetchLoadingSubId = ''
      }
    },
    async retryDispatch () {
      if (!this.jobId) return
      this.retrying = true
      try {
        await retryVerifyFixDispatch(this.jobId)
        this.$message.success('重试下发已提交')
        await this.loadWorkspace()
      } catch (e) {
        this.$message.error((e && e.message) || '重试下发失败')
      } finally {
        this.retrying = false
      }
    },
    async retryDispatchSub (subId) {
      if (!this.jobId || !subId) return
      this.retryingSubId = subId
      try {
        await retryVerifyFixDispatchSub(this.jobId, subId)
        this.$message.success('已重新下发该子任务')
        await this.loadWorkspace()
      } catch (e) {
        this.$message.error((e && e.message) || '重试下发失败')
      } finally {
        this.retryingSubId = ''
      }
    },
    liveRowKey (row, index) {
      return row.liveProbeId || `${row.address || ''}-${row.alive}-${index}`
    },
    portRowKey (row, index) {
      return `${row.ip || ''}-${row.port || ''}-${row.protocol || ''}-${row._idx != null ? row._idx : index}`
    },
    vulnRowKey (row, index) {
      return row.id || `${row.ip || ''}-${row.port || ''}-${row.vulId || ''}-${index}`
    },
    formatDateTime (value) {
      if (!value) return ''
      return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value
    },
    async loadHealth () {
      try {
        const health = await checkHealth()
        this.adapterMode = (health && health.adapterMode) || ''
      } catch (e) {
        this.adapterMode = ''
      }
    },
    async loadWorkspace () {
      if (!this.jobId) return
      this.loading = true
      try {
        const prevSurveySubId = this.surveySubId
        this.workspace = await getVerifyFixWorkspace(this.jobId)
        const subs = (this.workspace && this.workspace.rescanSubs) || []
        if (prevSurveySubId && subs.some(s => s.subId === prevSurveySubId)) {
          this.surveySubId = prevSurveySubId
        } else if (subs.length) {
          this.surveySubId = subs[0].subId
        } else {
          this.surveySubId = ''
        }
      } catch (e) {
        this.workspace = null
        this.$message.error(e.message || '加载工作台失败')
      } finally {
        this.loading = false
      }
    },
    async loadSurveyResults () {
      const taskId = this.resolveSurveyTaskId()
      if (!taskId || !this.surveySubId) {
        this.surveyResults = null
        return
      }
      this.surveyLoading = true
      try {
        this.surveyResults = await getOpenTaskSurveyResults(taskId, {
          scanPhase: 3,
          subId: this.surveySubId
        })
      } catch (e) {
        this.surveyResults = { hint: e.message || '加载失败', source: 'unavailable' }
      } finally {
        this.surveyLoading = false
      }
    },
    resolveSurveyTaskId () {
      const subs = (this.workspace && this.workspace.rescanSubs) || []
      const selected = subs.find(s => s.subId === this.surveySubId)
      if (selected && selected.taskId) return selected.taskId
      const items = (this.workspace && this.workspace.job && this.workspace.job.items) || []
      if (items.length && items[0].taskId) return items[0].taskId
      const tasks = (this.workspace && this.workspace.relatedTasks) || []
      return tasks.length ? tasks[0].taskId : ''
    },
    statusColor (status) {
      if (status === 'FINISHED') return 'green'
      if (status === 'FAILED') return 'red'
      if (status === 'RUNNING') return 'blue'
      return 'orange'
    },
    timelineColor (state) {
      if (state === 'done') return 'green'
      if (state === 'active') return 'blue'
      return 'gray'
    },
    goCase (caseId) {
      this.$router.push({ name: 'OperationCaseWorkspace', params: { caseId } })
    },
    goOpenTask (taskId) {
      this.$router.push({ name: 'OpenTaskWorkspace', params: { taskId } })
    },
    goRescanSub (sub) {
      if (!sub) return
      this.activeTab = 'rescanResults'
      this.surveySubId = sub.subId
      this.loadSurveyResults()
    },
    pickFile () {
      this.$refs.fileInput && this.$refs.fileInput.click()
    },
    onFileChange (e) {
      const f = e.target.files && e.target.files[0]
      this.xmlFile = f || null
      this.xmlFileName = f ? f.name : ''
    },
    async runComplete (fn, okMsg) {
      this.completing = true
      try {
        await fn(this.jobId)
        this.$message.success(okMsg)
        this.clearXmlFile()
        await this.loadWorkspace()
      } catch (e) {
        this.$message.error(e.message || '操作失败')
      } finally {
        this.completing = false
      }
    },
    clearXmlFile () {
      this.xmlFile = null
      this.xmlFileName = ''
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },
    importAndComplete () {
      if (!this.xmlFile) return
      this.runComplete(id => importVerifyFixRescanXml(id, this.xmlFile), '导入并完成')
    },
    oneClickFixed () {
      this.runComplete(completeVerifyFixAllFixed, '已全部标记为核验修复(6)')
    },
    oneClickUnfixed () {
      this.runComplete(completeVerifyFixAllUnfixed, '已全部标记为核验未修复(7)')
    }
  }
}
</script>

<style scoped>
.workspace-header-card { margin: 16px 0; }
.workspace-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.workspace-title { font-size: 18px; font-weight: 500; margin-bottom: 8px; }
.workspace-meta { color: rgba(0,0,0,.55); font-size: 13px; }
.progress-tag { margin-left: 8px; color: rgba(0,0,0,.45); font-size: 13px; }
.constraint-row { margin-top: 12px; }
.retry-hint { margin-top: 12px; }
.retry-warn { color: #f5222d; font-weight: 500; }
.phase-banner { margin-bottom: 16px; }
.phase-box { border: 1px solid #e8e8e8; border-radius: 4px; padding: 12px 16px; background: #fafafa; }
.phase-box h4 { margin-bottom: 8px; }
.phase-active { border-color: #87e8de; background: #e6fffb; }
.kv { display: flex; justify-content: space-between; font-size: 13px; margin-top: 4px; }
.section-label { font-size: 13px; color: rgba(0,0,0,.55); margin-bottom: 8px; }
.stat-row { display: flex; flex-wrap: wrap; gap: 12px; }
.stat-item { min-width: 72px; text-align: center; padding: 8px 12px; background: #fafafa; border-radius: 4px; }
.stat-item .num { font-size: 20px; font-weight: 500; }
.stat-item .lbl { font-size: 12px; color: rgba(0,0,0,.45); }
.timeline-at { font-size: 12px; color: rgba(0,0,0,.45); }
.survey-toolbar { margin-bottom: 8px; }
.api-hint { margin-left: 8px; font-size: 12px; color: rgba(0,0,0,.45); }
.survey-retry-toolbar { margin-bottom: 12px; }
.survey-retry-toolbar .api-hint {
  font-size: 12px;
  color: rgba(0,0,0,.45);
  font-family: Consolas, monospace;
  margin-left: 12px;
}
.muted { color: rgba(0,0,0,.45); }
.path-code { font-size: 11px; word-break: break-all; }
.sub-error-text { color: rgba(0,0,0,.65); font-size: 12px; }
.related-links { margin-top: 12px; }
.e2e-file-input { display: none; }
.e2e-file-name { margin-left: 8px; color: rgba(0,0,0,.65); }
</style>

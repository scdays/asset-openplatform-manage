<template>
  <div class="p_16 mock-e2e-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>Mock 联调</a-breadcrumb-item>
      <a-breadcrumb-item>全流程联调控制台</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      v-if="!adminKeyReady"
      type="warning"
      show-icon
      message="未配置 Admin Key"
      description="请在 window.conf 配置 VUE_APP_OPEN_API_ADMIN_KEY。Admin 管理走 /open-api-service 平台网关；Token 与 Open API 走 partner-gateway（同源 nginx/dev 反代至 35770，或配置 VUE_APP_OPEN_PARTNER_GATEWAY_URL 直连）。"
      style="margin: 16px 0;"
    />

    <a-card :bordered="false" class="e2e-header-card">
      <div class="e2e-header">
        <div>
          <h2 class="e2e-title">Manual Mock 全流程联调</h2>
          <p class="e2e-desc">覆盖 e2e-mock-manual-flow + e2e-full-flow：Partner、Token、建任务、导入 XML、外发/Webhook；可选实例状态机（验证→VERIFY_SCAN→处置→异步修复核验→运营完成→Webhook，修复核验不外发）。</p>
        </div>
        <div class="e2e-header-actions">
          <a-button :loading="running" type="primary" icon="play-circle" @click="runFullFlow">
            一键运行全流程
          </a-button>
          <a-button :disabled="running" @click="resetSession">重置</a-button>
        </div>
      </div>

      <a-steps :current="currentStep" size="small" class="e2e-steps">
        <a-step title="环境" />
        <a-step title="Partner" />
        <a-step title="Token" />
        <a-step title="建任务" />
        <a-step title="导入 XML" />
        <a-step title="验证" />
        <a-step title="外发" />
        <a-step title="Webhook" />
        <a-step v-if="taskForm.includeInstanceFsm" title="核验" />
        <a-step v-if="taskForm.includeInstanceFsm" title="修复核验" />
      </a-steps>
    </a-card>

    <a-row :gutter="16">
      <a-col :xs="24" :xl="10">
        <a-card title="接入方" :bordered="false" class="e2e-section-card" style="margin-top: 0;">
          <a-form-item label="接入方来源" class="e2e-partner-mode">
            <a-radio-group v-model="partnerMode" :disabled="running">
              <a-radio value="existing">选用已有（不创建）</a-radio>
              <a-radio value="create">临时新建 e2e-</a-radio>
            </a-radio-group>
          </a-form-item>

          <partner-session-panel
            v-if="partnerMode === 'existing'"
            ref="partnerSession"
            :initial-partner-id="initialPartnerId"
            hint-title="选用合作方管理中的接入方"
            hint-desc="选择 partnerId 后可直接点分步「2 Partner」「3 Token」，或点「绑定会话」。Token 会记入下方列表，并与其他运营页共享。"
            @bound="onPartnerBound"
            @cleared="onPartnerCleared"
            @partner-change="onPartnerSelect"
          />

          <a-form-item v-else label="partnerId（自动前缀 e2e-）">
            <a-input v-model="partnerSuffix" :disabled="running" placeholder="留空则使用时间戳" />
          </a-form-item>

          <a-card
            v-if="credentialBundle"
            type="inner"
            title="OAuth 凭证（新建 Partner 后请立即保存）"
            size="small"
            class="credential-bundle-card"
          >
            <a-alert
              type="error"
              show-icon
              message="clientSecret 仅本次展示"
              description="请立即复制保存。关闭页面或重置后无法再次查看，需到合作方详情重新生成凭证。"
              style="margin-bottom: 12px;"
            />
            <div class="credential-row">
              <span class="credential-label">partnerId</span>
              <code class="credential-value">{{ credentialBundle.partnerId }}</code>
              <a-button size="small" @click="copyText(credentialBundle.partnerId, 'partnerId')">复制</a-button>
            </div>
            <div class="credential-row">
              <span class="credential-label">clientId</span>
              <code class="credential-value">{{ credentialBundle.clientId }}</code>
              <a-button size="small" @click="copyText(credentialBundle.clientId, 'clientId')">复制</a-button>
            </div>
            <div class="credential-row">
              <span class="credential-label">clientSecret</span>
              <code class="credential-value secret">{{ credentialBundle.clientSecret }}</code>
              <a-button size="small" type="primary" @click="copyText(credentialBundle.clientSecret, 'clientSecret')">复制</a-button>
            </div>
            <div class="credential-actions">
              <a-button size="small" @click="copyCredentialBundle">复制完整接入包（JSON）</a-button>
            </div>
            <p class="credential-hint">步骤 3 Token 将用上述凭证换取 accessToken；也可在「修复核验运营 / SOC 编排」选同一 partnerId + 粘贴 Secret 复用。</p>
          </a-card>

          <a-card
            v-if="tokenRecords.length"
            type="inner"
            title="Token 记录"
            size="small"
            class="token-records-card"
          >
            <a-table
              :columns="tokenColumns"
              :data-source="tokenRecords"
              row-key="key"
              size="small"
              :pagination="false"
              :scroll="{ x: 720 }"
            >
              <span slot="tokenPreview" slot-scope="text, record">
                <code>{{ text }}</code>
                <a style="margin-left: 8px;" @click="copyToken(record)">复制</a>
              </span>
              <span slot="source" slot-scope="text">
                {{ tokenSourceLabel(text) }}
              </span>
            </a-table>
          </a-card>
        </a-card>

        <a-card title="联调参数" :bordered="false" class="e2e-section-card">
          <a-form layout="vertical" class="e2e-form">
            <a-form-item label="extTaskId">
              <a-input v-model="taskForm.extTaskId" :disabled="running" />
            </a-form-item>
            <a-form-item label="任务名称">
              <a-input v-model="taskForm.taskName" :disabled="running" />
            </a-form-item>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="scanTemplateId">
                  <a-select v-model="taskForm.scanTemplateId" :disabled="running">
                    <a-select-option :value="1002">1002 存活</a-select-option>
                    <a-select-option :value="1003">1003 端口</a-select-option>
                    <a-select-option :value="1001">1001 漏洞</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="reportTemplateId">
                  <a-select v-model="taskForm.reportTemplateId" :disabled="running">
                    <a-select-option :value="2001">2001 JSON</a-select-option>
                    <a-select-option :value="2002">2002 XML</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="扫描目标 hosts">
              <a-input v-model="taskForm.targets" :disabled="running" placeholder="逗号分隔 IP" />
            </a-form-item>
            <a-form-item label="NSFocus XML 报告（全流程必填）">
              <div class="e2e-upload-row">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".xml,application/xml,text/xml"
                  class="e2e-file-input"
                  @change="onFileChange"
                />
                <a-button icon="upload" :disabled="running" @click="pickFile">选择 XML</a-button>
                <span v-if="xmlFileName" class="e2e-file-name">{{ xmlFileName }}</span>
              </div>
            </a-form-item>
            <a-form-item>
              <a-checkbox v-model="taskForm.includeInstanceFsm" :disabled="running">
                包含实例状态机（验证/处置/修复核验 + 批量，修复核验仅 Webhook）
              </a-checkbox>
            </a-form-item>
            <template v-if="taskForm.includeInstanceFsm">
              <a-form-item>
                <a-checkbox v-model="taskForm.includeBatch" :disabled="running">
                  包含批量（verify/remediate/verify-fix:batch，需 XML ≥3 条实例）
                </a-checkbox>
              </a-form-item>
              <a-form-item>
                <a-checkbox v-model="taskForm.includeFalsePositive" :disabled="running">
                  包含误报分支（FALSE_POSITIVE 1→3，需额外 1 条实例）
                </a-checkbox>
              </a-form-item>
              <a-row :gutter="12">
                <a-col :span="12">
                  <a-form-item label="主实例运营完成">
                    <a-select v-model="taskForm.verifyFixMainMode" :disabled="running">
                      <a-select-option value="allFixed">一键核验修复(6)</a-select-option>
                      <a-select-option value="allUnfixed">一键核验未修复(7)</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="批量运营完成">
                    <a-select v-model="taskForm.verifyFixBatchMode" :disabled="running">
                      <a-select-option value="allUnfixed">全部未修复(7)</a-select-option>
                      <a-select-option value="allFixed">全部修复(6)</a-select-option>
                      <a-select-option value="compare">XML 比对完成</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
            </template>
            <a-form-item label="外发等待秒数">
              <a-input-number v-model="exportWaitSec" :min="10" :max="120" :disabled="running" style="width: 100%;" />
            </a-form-item>
          </a-form>

          <a-divider />

          <div class="e2e-session" v-if="session.partnerId">
            <div class="session-title">当前会话</div>
            <div class="session-row"><span>partnerId</span><code>{{ session.partnerId }}</code></div>
            <div class="session-row" v-if="session.clientId"><span>clientId</span><code>{{ session.clientId }}</code></div>
            <div class="session-row" v-if="session.accessToken"><span>Token</span><code>{{ tokenPreview(session.accessToken) }}</code></div>
            <div class="session-row" v-if="session.taskId"><span>taskId</span><code>{{ session.taskId }}</code></div>
            <div class="session-links" v-if="session.taskId">
              <a @click="goManualIngest">半人工导入页</a>
              <a-divider type="vertical" />
              <a @click="goWebhookLog">Webhook 日志</a>
              <a-divider type="vertical" />
              <a @click="goInvocations">调用记录</a>
            </div>
          </div>
        </a-card>

        <a-card title="分步执行" :bordered="false" class="e2e-section-card" style="margin-top: 16px;">
          <a-button-group class="e2e-step-buttons">
            <a-button size="small" :disabled="running" @click="runStep('health')">1 健康</a-button>
            <a-button size="small" :disabled="running" @click="runStep('partner')">2 Partner</a-button>
            <a-button size="small" :disabled="running" @click="runStep('token')">3 Token</a-button>
            <a-button size="small" :disabled="running" @click="runStep('createTask')">4 建任务</a-button>
            <a-button size="small" :disabled="running || !session.taskId" @click="runStep('import')">5 导入</a-button>
            <a-button size="small" :disabled="running || !session.taskId" @click="runStep('taskVerify')">6 任务完成</a-button>
            <a-button size="small" :disabled="running || !session.taskId" @click="runStep('export')">7 外发</a-button>
            <a-button size="small" :disabled="running || !session.partnerId" @click="runStep('webhook')">8 Webhook</a-button>
            <a-button
              size="small"
              :disabled="running || !session.taskId || !taskForm.includeInstanceFsm"
              @click="runStep('instanceFsm')"
            >9 状态机</a-button>
          </a-button-group>
        </a-card>
      </a-col>

      <a-col :xs="24" :xl="14">
        <a-card title="执行结果" :bordered="false" class="e2e-section-card">
          <div class="e2e-summary" v-if="results.length">
            <a-tag :color="summaryColor">{{ summaryText }}</a-tag>
            <span class="e2e-summary-time" v-if="lastRunAt">最近运行：{{ lastRunAt }}</span>
          </div>
          <a-empty v-if="!results.length" description="点击「一键运行全流程」或分步按钮开始" />

          <a-timeline v-else class="e2e-timeline">
            <a-timeline-item
              v-for="item in results"
              :key="item.key + item.at"
              :color="timelineColor(item.status)"
            >
              <div class="timeline-title">
                <strong>{{ item.title }}</strong>
                <enum-tag type="webhookDeliveryStatus" :value="mapStatus(item.status)" :fallback="item.status" />
              </div>
              <div class="timeline-msg">{{ item.message }}</div>
              <div v-if="item.partnerId && item.clientId && item.clientSecret" class="timeline-credential">
                <div class="timeline-cred-title">OAuth 凭证（请保存）</div>
                <div>partnerId: <code>{{ item.partnerId }}</code></div>
                <div>clientId: <code>{{ item.clientId }}</code></div>
                <div>clientSecret: <code class="secret">{{ item.clientSecret }}</code></div>
              </div>
              <div v-if="item.taskId" class="timeline-extra">taskId: <code>{{ item.taskId }}</code></div>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import EnumTag from '@/components/openPlatform/EnumTag'
import PartnerSessionPanel from '@/components/openPlatform/PartnerSessionPanel'
import { copyToClipboard } from '@/utils/copyToClipboard'
import { hasAdminKey } from '@/utils/openApiRequest'
import { clearPartnerSession, getPartnerSession } from '@/utils/openPartnerRequest'
import {
  buildRunId,
  runCreateTaskStep,
  runExportStep,
  runFullManualE2e,
  runHealthStep,
  runImportStep,
  runInstanceFsmFlow,
  runPartnerSkipStep,
  runPartnerStep,
  runTaskVerifyStep,
  runTokenSkipStep,
  runTokenStep,
  runWebhookStep
} from '@/api/openPlatform/e2eRunner'

const tokenColumns = [
  { title: 'partnerId', dataIndex: 'partnerId', key: 'partnerId', width: 140, ellipsis: true },
  { title: 'clientId', dataIndex: 'clientId', key: 'clientId', width: 140, ellipsis: true },
  { title: 'accessToken', dataIndex: 'tokenPreview', key: 'tokenPreview', scopedSlots: { customRender: 'tokenPreview' }, width: 220 },
  { title: 'expiresIn', dataIndex: 'expiresIn', key: 'expiresIn', width: 80 },
  { title: '来源', dataIndex: 'source', key: 'source', width: 90, scopedSlots: { customRender: 'source' } },
  { title: '获取时间', dataIndex: 'obtainedAt', key: 'obtainedAt', width: 160 }
]

const MSG = {
  pickXmlWarn: '请选择 .xml 文件',
  resetInfo: '已重置联调会话',
  configAdmin: '请先配置 VUE_APP_OPEN_API_ADMIN_KEY',
  needXml: '全流程需要先选择 NSFocus XML 报告',
  flowFail: '全流程结束，',
  flowFailSuffix: ' 步失败',
  flowOk: '全流程联调通过',
  needAdmin: '请先配置 Admin Key',
  needPartner: '请先选择接入方或执行 Partner 步骤',
  needToken: '请先获取或绑定 Token',
  needTask: '请先建任务',
  needXmlShort: '请选择 XML',
  passSuffix: ' 通过',
  summaryDone: '完成',
  summaryFail: '失败',
  summaryStep: '步',
  summaryAll: '全部',
  summaryPass: '步通过'
}

export default {
  name: 'MockE2eConsole',
  components: { EnumTag, PartnerSessionPanel },
  data () {
    const runId = buildRunId()
    return {
      runId,
      running: false,
      partnerMode: 'existing',
      selectedPartnerId: '',
      partnerSuffix: '',
      tokenColumns,
      tokenRecords: [],
      credentialBundle: null,
      exportWaitSec: 45,
      xmlFile: null,
      xmlFileName: '',
      taskForm: {
        extTaskId: `EXT-E2E-${runId}`,
        taskName: 'console-manual-e2e',
        type: 1,
        scanTemplateId: 1002,
        reportTemplateId: 2001,
        targets: '172.16.3.22,172.16.3.23,172.16.3.24',
        expectManualMode: true,
        includeInstanceFsm: true,
        includeBatch: true,
        includeFalsePositive: false,
        verifyFixMainMode: 'allFixed',
        verifyFixBatchMode: 'allUnfixed'
      },
      session: {
        partnerId: '',
        clientId: '',
        clientSecret: '',
        accessToken: '',
        taskId: '',
        vulInfoIds: [],
        expiresIn: null,
        tokenSource: ''
      },
      results: [],
      lastRunAt: ''
    }
  },
  computed: {
    adminKeyReady () {
      return hasAdminKey()
    },
    partnerId () {
      if (this.partnerMode === 'existing') {
        return this.resolvePartnerId()
      }
      const suffix = (this.partnerSuffix || '').trim() || buildRunId()
      return `e2e-${suffix}`
    },
    initialPartnerId () {
      return (this.$route.query.partnerId || '').trim()
    },
    effectivePartnerId () {
      return this.resolvePartnerId()
    },
    currentStep () {
      if (!this.results.length) return 0
      const order = [
        'health', 'partner', 'token', 'createTask', 'import', 'taskVerify', 'export', 'webhook',
        'instVerify', 'verifyScanExport', 'instRemediate', 'instVerifyFix', 'verifyFixAdmin',
        'instStat', 'verifyFixWebhook', 'instBatch', 'instanceFsm'
      ]
      let max = 0
      this.results.forEach(r => {
        const idx = order.indexOf(r.key)
        if (idx >= 0 && (r.status === 'success' || r.status === 'skip')) max = Math.max(max, idx + 1)
      })
      return max
    },
    summaryText () {
      const errors = this.results.filter(r => r.status === 'error').length
      const ok = this.results.filter(r => r.status === 'success').length
      if (errors) return `${MSG.summaryDone} ${ok} ${MSG.summaryStep}，${MSG.summaryFail} ${errors} ${MSG.summaryStep}`
      return `${MSG.summaryAll} ${ok} ${MSG.summaryPass}`
    },
    summaryColor () {
      return this.results.some(r => r.status === 'error') ? 'red' : 'green'
    }
  },
  mounted () {
    this.hydratePartnerSession()
  },
  methods: {
    hydratePartnerSession () {
      const s = getPartnerSession()
      if (!s.partnerId || !s.accessToken) return
      this.session.partnerId = s.partnerId
      this.session.accessToken = s.accessToken
      this.selectedPartnerId = s.partnerId
      this.addTokenRecord({
        partnerId: s.partnerId,
        accessToken: s.accessToken,
        source: 'restored'
      }, true)
    },
    onPartnerSelect (payload) {
      this.selectedPartnerId = (payload && payload.partnerId) || ''
      if (payload && payload.clientId) {
        this.session.clientId = payload.clientId
      }
    },
    onPartnerBound (payload) {
      this.selectedPartnerId = payload.partnerId
      this.session.partnerId = payload.partnerId
      this.session.accessToken = payload.accessToken
      if (payload.clientId) this.session.clientId = payload.clientId
      if (payload.clientSecret) this.session.clientSecret = payload.clientSecret
      this.session.expiresIn = payload.expiresIn
      this.session.tokenSource = payload.source
      this.addTokenRecord(payload)
    },
    onPartnerCleared () {
      this.selectedPartnerId = ''
      this.session.partnerId = ''
      this.session.accessToken = ''
      this.session.clientId = ''
      this.session.clientSecret = ''
      this.session.expiresIn = null
      this.session.tokenSource = ''
    },
    tokenPreview (token) {
      if (!token) return ''
      if (token.length <= 16) return token
      return `${token.slice(0, 8)}…${token.slice(-6)}`
    },
    tokenSourceLabel (source) {
      const map = {
        paste: '粘贴',
        credential: '凭证换取',
        bound: '已绑定',
        restored: '会话恢复',
        create: '新建凭证'
      }
      return map[source] || source || '-'
    },
    addTokenRecord (payload, silent) {
      if (!payload || !payload.partnerId || !payload.accessToken) return
      const dup = this.tokenRecords.find(r =>
        r.partnerId === payload.partnerId && r.accessToken === payload.accessToken
      )
      if (dup) {
        dup.obtainedAt = this.formatTime(new Date())
        return
      }
      this.tokenRecords.unshift({
        key: `${payload.partnerId}-${Date.now()}`,
        partnerId: payload.partnerId,
        clientId: payload.clientId || this.session.clientId || '-',
        accessToken: payload.accessToken,
        tokenPreview: this.tokenPreview(payload.accessToken),
        expiresIn: payload.expiresIn != null ? payload.expiresIn : '-',
        source: payload.source || 'bind',
        obtainedAt: this.formatTime(new Date())
      })
      if (!silent) {
        this.$message.success('Token 已加入记录列表')
      }
    },
    saveCredentialBundle (result) {
      if (!result || !result.clientSecret) return
      const isNew = !this.credentialBundle ||
        this.credentialBundle.clientSecret !== result.clientSecret
      this.credentialBundle = {
        partnerId: result.partnerId,
        clientId: result.clientId,
        clientSecret: result.clientSecret,
        createdAt: this.formatTime(new Date())
      }
      if (isNew) {
        this.$notification.warning({
          message: 'Partner 已创建，请立即保存凭证',
          description: 'clientSecret 仅本次展示，见左侧「OAuth 凭证」卡片。',
          duration: 10
        })
      }
    },
    copyText (text, label) {
      if (!text) return
      copyToClipboard(text)
        .then(() => this.$message.success(`${label || '内容'} 已复制`))
        .catch(() => this.$message.error('复制失败，请手动选中文本复制'))
    },
    copyCredentialBundle () {
      if (!this.credentialBundle) return
      const payload = {
        partnerId: this.credentialBundle.partnerId,
        clientId: this.credentialBundle.clientId,
        clientSecret: this.credentialBundle.clientSecret,
        grantType: 'client_credentials'
      }
      this.copyText(JSON.stringify(payload, null, 2), '接入包')
    },
    copyToken (record) {
      const text = record && record.accessToken
      if (!text) return
      this.copyText(text, 'Token')
    },
    resolvePartnerId () {
      const panel = this.$refs.partnerSession
      const fromPanel = panel && panel.getFormState ? panel.getFormState().partnerId : ''
      return (this.session.partnerId || this.selectedPartnerId || fromPanel || '').trim()
    },
    /** 将接入方面板中的凭证/Token 同步到联调会话（分步执行用） */
    syncPanelToSession () {
      const panel = this.$refs.partnerSession
      if (!panel || !panel.getFormState) return
      const f = panel.getFormState()
      const pid = (f.partnerId || this.selectedPartnerId || this.session.partnerId || '').trim()
      if (pid) {
        this.selectedPartnerId = pid
        this.session.partnerId = pid
      }
      if (f.clientId) this.session.clientId = f.clientId
      if (f.clientSecret) this.session.clientSecret = f.clientSecret
      const pasted = (f.accessToken || '').trim()
      if (pasted && !this.session.accessToken) {
        this.session.accessToken = pasted
        this.session.tokenSource = f.authMode === 'credential' ? 'credential' : 'paste'
      }
    },
    buildE2eContext () {
      this.syncPanelToSession()
      return {
        partnerMode: this.partnerMode,
        partnerId: this.effectivePartnerId,
        clientId: this.session.clientId,
        clientSecret: this.session.clientSecret,
        accessToken: this.session.accessToken,
        expiresIn: this.session.expiresIn,
        tokenSource: this.session.tokenSource,
        taskForm: this.taskForm,
        xmlFile: this.xmlFile,
        minInstances: this.resolveMinInstances(),
        exportWaitSec: this.exportWaitSec,
        includeInstanceFsm: this.taskForm.includeInstanceFsm,
        runId: this.runId
      }
    },
    pickFile () {
      const input = this.$refs.fileInput
      if (input) input.click()
    },
    onFileChange (e) {
      const file = e.target && e.target.files && e.target.files[0]
      if (!file) return
      if (!file.name.toLowerCase().endsWith('.xml')) {
        this.$message.warning(MSG.pickXmlWarn)
        return
      }
      this.xmlFile = file
      this.xmlFileName = file.name
    },
    mergeSession (result) {
      if (!result) return
      if (result.partnerId) this.session.partnerId = result.partnerId
      if (result.clientId) this.session.clientId = result.clientId
      if (result.clientSecret) {
        this.session.clientSecret = result.clientSecret
        this.saveCredentialBundle(result)
      }
      if (result.accessToken) {
        this.session.accessToken = result.accessToken
        this.addTokenRecord({
          partnerId: result.partnerId || this.session.partnerId,
          accessToken: result.accessToken,
          clientId: result.clientId || this.session.clientId,
          expiresIn: result.expiresIn,
          source: result.source || (result.skipped ? 'bound' : 'create')
        }, true)
      }
      if (result.taskId) this.session.taskId = result.taskId
      if (result.vulInfoIds && result.vulInfoIds.length) {
        this.session.vulInfoIds = result.vulInfoIds
      } else if (result.vulInfoId) {
        this.session.vulInfoIds = [result.vulInfoId]
      } else if (result.instanceIds && result.instanceIds.length) {
        this.session.vulInfoIds = result.instanceIds
      }
    },
    appendResult (result) {
      this.results.push(result)
      this.mergeSession(result)
    },
    mapStatus (status) {
      if (status === 'success') return 'SUCCESS'
      if (status === 'error') return 'FAILED'
      if (status === 'skip') return 'SKIPPED'
      return 'PENDING'
    },
    timelineColor (status) {
      if (status === 'success') return 'green'
      if (status === 'error') return 'red'
      if (status === 'skip') return 'gray'
      return 'blue'
    },
    resetSession () {
      this.results = []
      this.selectedPartnerId = ''
      this.session = {
        partnerId: '', clientId: '', clientSecret: '', accessToken: '', taskId: '', vulInfoIds: [],
        expiresIn: null, tokenSource: ''
      }
      this.tokenRecords = []
      this.credentialBundle = null
      clearPartnerSession()
      this.runId = buildRunId()
      this.taskForm.extTaskId = `EXT-E2E-${this.runId}`
      this.$message.info(MSG.resetInfo)
    },
    async runFullFlow () {
      if (!this.adminKeyReady) {
        this.$message.warning(MSG.configAdmin)
        return
      }
      if (!this.xmlFile) {
        this.$message.warning(MSG.needXml)
        return
      }
      this.running = true
      this.results = []
      try {
        const list = await runFullManualE2e(this.buildE2eContext())
        list.forEach(r => this.appendResult(r))
        this.lastRunAt = this.formatTime(new Date())
        const failed = list.filter(r => r.status === 'error')
        if (failed.length) {
          this.$message.error(MSG.flowFail + failed.length + MSG.flowFailSuffix)
        } else {
          this.$message.success(MSG.flowOk)
        }
      } finally {
        this.running = false
      }
    },
    async runStep (key) {
      if (!this.adminKeyReady && key !== 'health') {
        this.$message.warning(MSG.needAdmin)
        return
      }
      this.running = true
      let result
      try {
        switch (key) {
          case 'health':
            result = await runHealthStep()
            break
          case 'partner':
            if (this.partnerMode === 'existing') {
              this.syncPanelToSession()
              const pid = this.resolvePartnerId()
              if (!pid) {
                this.$message.warning('请先在上方下拉选择接入方')
                return
              }
              this.session.partnerId = pid
              result = await runPartnerSkipStep(pid, {
                clientId: this.session.clientId,
                clientSecret: this.session.clientSecret
              })
            } else {
              result = await runPartnerStep(this.partnerId)
            }
            break
          case 'token':
            if (this.partnerMode === 'existing') {
              this.syncPanelToSession()
              const pid = this.resolvePartnerId()
              if (!pid) {
                this.$message.warning('请先在上方下拉选择接入方')
                return
              }
              this.session.partnerId = pid
              const token = (this.session.accessToken || '').trim()
              if (token) {
                result = await runTokenSkipStep(pid, token, {
                  clientId: this.session.clientId,
                  expiresIn: this.session.expiresIn,
                  source: this.session.tokenSource || 'bound'
                })
              } else if (this.session.clientId && this.session.clientSecret) {
                result = await runTokenStep(
                  this.session.clientId,
                  this.session.clientSecret,
                  pid
                )
              } else {
                this.$message.warning('请粘贴 Token，或填写 clientSecret 后点 Token；也可点「绑定会话」')
                return
              }
            } else {
              if (!this.session.clientId) {
                this.$message.warning(MSG.needPartner)
                return
              }
              result = await runTokenStep(
                this.session.clientId,
                this.session.clientSecret,
                this.session.partnerId || this.partnerId
              )
            }
            break
          case 'createTask':
            result = await runCreateTaskStep(this.taskForm, this.effectivePartnerId)
            break
          case 'import':
            if (!this.session.taskId) {
              this.$message.warning(MSG.needTask)
              return
            }
            if (!this.xmlFile) {
              this.$message.warning(MSG.needXmlShort)
              return
            }
            result = await runImportStep(this.session.taskId, this.xmlFile)
            break
          case 'taskVerify':
            result = await runTaskVerifyStep(this.session.taskId)
            break
          case 'export':
            result = await runExportStep(this.session.taskId, {
              expectJsonOnly: this.taskForm.reportTemplateId === 2001,
              maxWaitSec: this.exportWaitSec
            })
            break
          case 'webhook':
            result = await runWebhookStep(this.session.partnerId, this.session.taskId)
            break
          case 'instanceFsm':
            if (!this.session.taskId) {
              this.$message.warning(MSG.needTask)
              return
            }
            {
              const fsmList = await runInstanceFsmFlow({
                taskId: this.session.taskId,
                partnerId: this.effectivePartnerId,
                runId: this.runId,
                exportWaitSec: this.exportWaitSec,
                includeBatch: this.taskForm.includeBatch,
                includeFalsePositive: this.taskForm.includeFalsePositive,
                verifyFixMainMode: this.taskForm.verifyFixMainMode,
                verifyFixBatchMode: this.taskForm.verifyFixBatchMode,
                xmlFile: this.xmlFile
              })
              fsmList.forEach(item => this.appendResult(item))
              this.lastRunAt = this.formatTime(new Date())
              const failed = fsmList.filter(r => r.status === 'error')
              if (failed.length) {
                this.$message.error(MSG.flowFail + failed.length + MSG.flowFailSuffix)
              } else {
                this.$message.success(MSG.flowOk)
              }
              return
            }
          default:
            return
        }
        this.appendResult(result)
        this.lastRunAt = this.formatTime(new Date())
        if (result.status === 'success') {
          this.$message.success(result.title + MSG.passSuffix)
        } else if (result.status === 'error') {
          this.$message.error(result.message)
        }
      } finally {
        this.running = false
      }
    },
    goManualIngest () {
      this.$router.push({ name: 'MockManualIngest', query: { taskId: this.session.taskId } })
    },
    goWebhookLog () {
      this.$router.push({
        name: 'WebhookDeliveryList',
        query: { partnerId: this.session.partnerId, resourceId: this.session.taskId }
      })
    },
    goInvocations () {
      this.$router.push({
        name: 'InvocationList',
        query: { partnerId: this.session.partnerId, resourceId: this.session.taskId }
      })
    },
    formatTime (d) {
      return this.$moment ? this.$moment(d).format('YYYY-MM-DD HH:mm:ss') : d.toISOString()
    },
    resolveMinInstances () {
      if (!this.taskForm.includeInstanceFsm) return 1
      let min = 1
      if (this.taskForm.includeBatch) min = Math.max(min, 3)
      if (this.taskForm.includeFalsePositive) min = Math.max(min, 4)
      return min
    }
  }
}
</script>

<style scoped>
.mock-e2e-page {
  background: #f0f2f5;
  min-height: 100%;
}

.e2e-header-card,
.e2e-section-card {
  margin-top: 16px;
}

.e2e-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.e2e-title {
  margin: 0 0 8px;
  font-size: 20px;
}

.e2e-desc {
  margin: 0;
  color: rgba(0, 0, 0, 0.55);
  font-size: 13px;
  line-height: 1.6;
  max-width: 720px;
}

.e2e-header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.e2e-steps {
  margin-top: 20px;
}

.e2e-partner-mode {
  margin-bottom: 8px;
}

.token-records-card {
  margin-top: 12px;
}

.token-records-card code {
  font-size: 12px;
}

.e2e-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.e2e-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.e2e-file-input {
  display: none;
}

.e2e-file-name {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.e2e-session {
  font-size: 13px;
}

.session-title {
  font-weight: 500;
  margin-bottom: 8px;
}

.session-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  align-items: baseline;
}

.session-row span {
  color: rgba(0, 0, 0, 0.45);
  min-width: 72px;
}

.session-row code,
.timeline-extra code {
  color: rgba(0, 0, 0, 0.85);
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  padding: 0 4px;
  border-radius: 2px;
  font-size: 12px;
  word-break: break-all;
}

.session-links {
  margin-top: 10px;
}

.e2e-step-buttons {
  display: flex;
  flex-wrap: wrap;
}

.e2e-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.e2e-summary-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.timeline-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.timeline-msg {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.timeline-extra {
  margin-top: 4px;
  font-size: 12px;
}

.timeline-credential {
  margin-top: 8px;
  padding: 8px 10px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.7;
}

.timeline-cred-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: rgba(0, 0, 0, 0.85);
}

.timeline-credential code.secret,
.credential-value.secret {
  color: #cf1322;
  word-break: break-all;
}

.credential-bundle-card {
  margin-top: 12px;
}

.credential-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.credential-label {
  min-width: 88px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  line-height: 28px;
}

.credential-value {
  flex: 1;
  min-width: 120px;
  font-size: 12px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  padding: 4px 6px;
  border-radius: 2px;
  word-break: break-all;
}

.credential-actions {
  margin: 8px 0;
}

.credential-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.6;
}
</style>

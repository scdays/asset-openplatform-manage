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
          <p class="e2e-desc">覆盖脚本 e2e-mock-manual-flow + e2e-full-flow 核心路径：Partner、Token、建任务(RUNNING)、导入 XML、FINISHED、实例、外发、Webhook。</p>
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
        <a-step v-if="taskForm.includeInstanceFsm" title="状态机" />
      </a-steps>
    </a-card>

    <a-row :gutter="16">
      <a-col :xs="24" :xl="10">
        <a-card title="联调参数" :bordered="false" class="e2e-section-card">
          <a-form layout="vertical" class="e2e-form">
            <a-form-item label="partnerId（自动前缀 e2e-）">
              <a-input v-model="partnerSuffix" :disabled="running" placeholder="留空则使用时间戳" />
            </a-form-item>
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
                包含实例状态机（核验、修复、修复核验 + VERIFY_FIX 外发）
              </a-checkbox>
            </a-form-item>
            <a-form-item label="外发等待秒数">
              <a-input-number v-model="exportWaitSec" :min="10" :max="120" :disabled="running" style="width: 100%;" />
            </a-form-item>
          </a-form>

          <a-divider />

          <div class="e2e-session" v-if="session.partnerId">
            <div class="session-title">当前会话</div>
            <div class="session-row"><span>partnerId</span><code>{{ session.partnerId }}</code></div>
            <div class="session-row" v-if="session.clientId"><span>clientId</span><code>{{ session.clientId }}</code></div>
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
            <a-button size="small" :disabled="running || !session.taskId" @click="runStep('taskVerify')">6 验证</a-button>
            <a-button size="small" :disabled="running || !session.taskId" @click="runStep('export')">7 外发</a-button>
            <a-button size="small" :disabled="running || !session.partnerId" @click="runStep('webhook')">8 Webhook</a-button>
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
import { hasAdminKey } from '@/utils/openApiRequest'
import { clearPartnerSession } from '@/utils/openPartnerRequest'
import {
  buildRunId,
  runCreateTaskStep,
  runExportStep,
  runFullManualE2e,
  runHealthStep,
  runImportStep,
  runPartnerStep,
  runTaskVerifyStep,
  runTokenStep,
  runWebhookStep
} from '@/api/openPlatform/e2eRunner'

const MSG = {
  pickXmlWarn: '请选择 .xml 文件',
  resetInfo: '已重置联调会话',
  configAdmin: '请先配置 VUE_APP_OPEN_API_ADMIN_KEY',
  needXml: '全流程需要先选择 NSFocus XML 报告',
  flowFail: '全流程结束，',
  flowFailSuffix: ' 步失败',
  flowOk: '全流程联调通过',
  needAdmin: '请先配置 Admin Key',
  needPartner: '请先执行 Partner 步骤',
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
  components: { EnumTag },
  data () {
    const runId = buildRunId()
    return {
      runId,
      running: false,
      partnerSuffix: '',
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
        includeInstanceFsm: false
      },
      session: {
        partnerId: '',
        clientId: '',
        clientSecret: '',
        accessToken: '',
        taskId: ''
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
      const suffix = (this.partnerSuffix || '').trim() || buildRunId()
      return `e2e-${suffix}`
    },
    currentStep () {
      if (!this.results.length) return 0
      const order = ['health', 'partner', 'token', 'createTask', 'import', 'taskVerify', 'export', 'webhook', 'instanceFsm']
      let max = 0
      this.results.forEach(r => {
        const idx = order.indexOf(r.key)
        if (idx >= 0 && r.status === 'success') max = Math.max(max, idx + 1)
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
  methods: {
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
      if (result.clientSecret) this.session.clientSecret = result.clientSecret
      if (result.accessToken) this.session.accessToken = result.accessToken
      if (result.taskId) this.session.taskId = result.taskId
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
      this.session = { partnerId: '', clientId: '', clientSecret: '', accessToken: '', taskId: '' }
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
        const list = await runFullManualE2e({
          partnerId: this.partnerId,
          taskForm: this.taskForm,
          xmlFile: this.xmlFile,
          minInstances: 1,
          exportWaitSec: this.exportWaitSec,
          includeInstanceFsm: this.taskForm.includeInstanceFsm,
          runId: this.runId
        })
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
            result = await runPartnerStep(this.partnerId)
            break
          case 'token':
            if (!this.session.clientId) {
              this.$message.warning(MSG.needPartner)
              return
            }
            result = await runTokenStep(this.session.clientId, this.session.clientSecret, this.session.partnerId || this.partnerId)
            break
          case 'createTask':
            result = await runCreateTaskStep(this.taskForm, this.session.partnerId || this.partnerId)
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
</style>

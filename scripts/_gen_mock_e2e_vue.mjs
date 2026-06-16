import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { t } from './lib/zh-e2e-console-hex.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(__dirname, '../src/views/openPlatform/MockE2eConsole.vue')

const content = `<template>
  <div class="p_16 mock-e2e-page">
    <a-breadcrumb>
      <a-breadcrumb-item>${t('openPlatform')}</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">${t('featureOverview')}</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>${t('mockLab')}</a-breadcrumb-item>
      <a-breadcrumb-item>${t('consoleTitle')}</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      v-if="!adminKeyReady"
      type="warning"
      show-icon
      message="${t('noAdminKey')}"
      description="${t('adminKeyHint')}"
      style="margin: 16px 0;"
    />

    <a-card :bordered="false" class="e2e-header-card">
      <div class="e2e-header">
        <div>
          <h2 class="e2e-title">${t('pageTitle')}</h2>
          <p class="e2e-desc">${t('pageDesc')}</p>
        </div>
        <div class="e2e-header-actions">
          <a-button :loading="running" type="primary" icon="play-circle" @click="runFullFlow">
            ${t('runAll')}
          </a-button>
          <a-button :disabled="running" @click="resetSession">${t('reset')}</a-button>
        </div>
      </div>

      <a-steps :current="currentStep" size="small" class="e2e-steps">
        <a-step title="${t('stepEnv')}" />
        <a-step title="Partner" />
        <a-step title="Token" />
        <a-step title="${t('stepCreateTask')}" />
        <a-step title="${t('stepImportXml')}" />
        <a-step title="${t('stepVerify')}" />
        <a-step title="${t('stepExport')}" />
        <a-step title="Webhook" />
        <a-step v-if="taskForm.includeInstanceFsm" title="${t('stepFsm')}" />
      </a-steps>
    </a-card>

    <a-row :gutter="16">
      <a-col :xs="24" :xl="10">
        <a-card title="${t('paramsTitle')}" :bordered="false" class="e2e-section-card">
          <a-form layout="vertical" class="e2e-form">
            <a-form-item label="${t('partnerIdLabel')}">
              <a-input v-model="partnerSuffix" :disabled="running" placeholder="${t('partnerPlaceholder')}" />
            </a-form-item>
            <a-form-item label="extTaskId">
              <a-input v-model="taskForm.extTaskId" :disabled="running" />
            </a-form-item>
            <a-form-item label="${t('taskName')}">
              <a-input v-model="taskForm.taskName" :disabled="running" />
            </a-form-item>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="scanTemplateId">
                  <a-select v-model="taskForm.scanTemplateId" :disabled="running">
                    <a-select-option :value="1002">${t('tpl1002')}</a-select-option>
                    <a-select-option :value="1003">${t('tpl1003')}</a-select-option>
                    <a-select-option :value="1001">${t('tpl1001')}</a-select-option>
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
            <a-form-item label="${t('scanTargets')}">
              <a-input v-model="taskForm.targets" :disabled="running" placeholder="${t('targetsPlaceholder')}" />
            </a-form-item>
            <a-form-item label="${t('xmlLabel')}">
              <div class="e2e-upload-row">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".xml,application/xml,text/xml"
                  class="e2e-file-input"
                  @change="onFileChange"
                />
                <a-button icon="upload" :disabled="running" @click="pickFile">${t('pickXml')}</a-button>
                <span v-if="xmlFileName" class="e2e-file-name">{{ xmlFileName }}</span>
              </div>
            </a-form-item>
            <a-form-item>
              <a-checkbox v-model="taskForm.includeInstanceFsm" :disabled="running">
                ${t('includeFsm')}
              </a-checkbox>
            </a-form-item>
            <a-form-item label="${t('exportWaitSec')}">
              <a-input-number v-model="exportWaitSec" :min="10" :max="120" :disabled="running" style="width: 100%;" />
            </a-form-item>
          </a-form>

          <a-divider />

          <div class="e2e-session" v-if="session.partnerId">
            <div class="session-title">${t('sessionTitle')}</div>
            <div class="session-row"><span>partnerId</span><code>{{ session.partnerId }}</code></div>
            <div class="session-row" v-if="session.clientId"><span>clientId</span><code>{{ session.clientId }}</code></div>
            <div class="session-row" v-if="session.taskId"><span>taskId</span><code>{{ session.taskId }}</code></div>
            <div class="session-links" v-if="session.taskId">
              <a @click="goManualIngest">${t('goManual')}</a>
              <a-divider type="vertical" />
              <a @click="goWebhookLog">${t('goWebhook')}</a>
              <a-divider type="vertical" />
              <a @click="goInvocations">${t('goInvocation')}</a>
            </div>
          </div>
        </a-card>

        <a-card title="${t('stepExec')}" :bordered="false" class="e2e-section-card" style="margin-top: 16px;">
          <a-button-group class="e2e-step-buttons">
            <a-button size="small" :disabled="running" @click="runStep('health')">${t('s1')}</a-button>
            <a-button size="small" :disabled="running" @click="runStep('partner')">2 Partner</a-button>
            <a-button size="small" :disabled="running" @click="runStep('token')">3 Token</a-button>
            <a-button size="small" :disabled="running" @click="runStep('createTask')">${t('s4')}</a-button>
            <a-button size="small" :disabled="running || !session.taskId" @click="runStep('import')">${t('s5')}</a-button>
            <a-button size="small" :disabled="running || !session.taskId" @click="runStep('taskVerify')">${t('s6')}</a-button>
            <a-button size="small" :disabled="running || !session.taskId" @click="runStep('export')">${t('s7')}</a-button>
            <a-button size="small" :disabled="running || !session.partnerId" @click="runStep('webhook')">8 Webhook</a-button>
          </a-button-group>
        </a-card>
      </a-col>

      <a-col :xs="24" :xl="14">
        <a-card title="${t('resultTitle')}" :bordered="false" class="e2e-section-card">
          <div class="e2e-summary" v-if="results.length">
            <a-tag :color="summaryColor">{{ summaryText }}</a-tag>
            <span class="e2e-summary-time" v-if="lastRunAt">${t('lastRun')}{{ lastRunAt }}</span>
          </div>
          <a-empty v-if="!results.length" description="${t('emptyHint')}" />

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
  pickXmlWarn: '${t('pickXmlWarn')}',
  resetInfo: '${t('resetInfo')}',
  configAdmin: '${t('configAdmin')}',
  needXml: '${t('needXml')}',
  flowFail: '${t('flowFail')}',
  flowFailSuffix: '${t('flowFailSuffix')}',
  flowOk: '${t('flowOk')}',
  needAdmin: '${t('needAdmin')}',
  needPartner: '${t('needPartner')}',
  needTask: '${t('needTask')}',
  needXmlShort: '${t('needXmlShort')}',
  passSuffix: '${t('passSuffix')}',
  summaryDone: '${t('summaryDone')}',
  summaryFail: '${t('summaryFail')}',
  summaryStep: '${t('summaryStep')}',
  summaryAll: '${t('summaryAll')}',
  summaryPass: '${t('summaryPass')}'
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
        extTaskId: \`EXT-E2E-\${runId}\`,
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
      return \`e2e-\${suffix}\`
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
      if (errors) return \`\${MSG.summaryDone} \${ok} \${MSG.summaryStep}\uff0c\${MSG.summaryFail} \${errors} \${MSG.summaryStep}\`
      return \`\${MSG.summaryAll} \${ok} \${MSG.summaryPass}\`
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
      this.taskForm.extTaskId = \`EXT-E2E-\${this.runId}\`
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
`

fs.writeFileSync(out, content, 'utf8')
console.log('written', out)

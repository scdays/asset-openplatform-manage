<template>
  <div class="p_16 verify-fix-ops-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>处置测试</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      message="Partner Open API 联调（验证 / 处置修复 / 修复核验）"
      description="绑定接入方会话后加载实例，多选并按阶段调用 Open API。修复核验受理后的运营跟踪请使用「修复核验」工作台。"
      style="margin: 16px 0;"
    />

    <partner-session-panel
      ref="partnerSession"
      :initial-partner-id="initialPartnerId"
      style="margin-bottom: 16px;"
      @bound="onPartnerBound"
      @partner-change="onPartnerChange"
    />

    <a-card title="漏洞实例" :bordered="false" style="margin-bottom: 16px;">
      <a-form layout="inline" class="instance-filter-form">
        <a-form-item label="taskId（可选）">
          <a-input
            v-model="filterTaskId"
            placeholder="平台 TASK-xxx"
            style="width: 200px;"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="漏洞状态">
          <a-select v-model="filterStat" style="width: 160px;">
            <a-select-option value="">全部</a-select-option>
            <a-select-option v-for="opt in vulInfoStatOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="loadingInstances" @click="loadInstances">查询实例</a-button>
          <a-button style="margin-left: 8px;" @click="loadFixedInstances">仅已修复(5)</a-button>
        </a-form-item>
      </a-form>

      <a-table
        :columns="instanceColumns"
        :data-source="instances"
        row-key="vulInfoId"
        size="small"
        :loading="loadingInstances"
        :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10','20','50','100'] }"
        :row-selection="instanceRowSelection"
        style="margin-top: 12px;"
      >
        <span slot="vulInfoStat" slot-scope="text">
          <enum-tag v-if="text != null && text !== ''" type="vulInfoStat" :value="text" with-code />
          <span v-else>-</span>
        </span>
      </a-table>
      <p v-if="!loadingInstances && !instances.length" class="job-hint muted">
        暂无实例。请先绑定接入方，并在任务工作台完成绿盟 XML 导入入库。
      </p>
      <p v-if="selectedVulInfoIds.length" class="candidate-hint">已选 {{ selectedVulInfoIds.length }} 条</p>
    </a-card>

    <a-card title="处置阶段" :bordered="false" style="margin-bottom: 16px;">
      <a-tabs v-model="activeTab">
        <a-tab-pane key="verify" tab="漏洞验证">
          <p class="tab-desc">调用 <code>POST /instances/verify:batch</code>，将 stat=0/1 的实例标记为有效(2)或误报(3)。</p>
          <a-form layout="inline" style="margin-bottom: 12px;">
            <a-form-item label="verifyResult">
              <a-radio-group v-model="verifyResult">
                <a-radio value="VALID">VALID → stat=2</a-radio>
                <a-radio value="FALSE_POSITIVE">FALSE_POSITIVE → stat=3</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-form>
          <a-button
            type="primary"
            :disabled="!canSubmitVerify"
            :loading="acting"
            @click="submitVerify"
          >提交漏洞验证</a-button>
          <span v-if="!canSubmitVerify && selectedVulInfoIds.length" class="tab-warn">所选实例须均为 stat=0/1</span>
        </a-tab-pane>

        <a-tab-pane key="remediate" tab="处置修复">
          <p class="tab-desc">调用 <code>POST /instances/remediate:batch</code>，将 stat=1/2/7 的实例处置为已修复(5)。</p>
          <a-button
            type="primary"
            :disabled="!canSubmitRemediate"
            :loading="acting"
            @click="submitRemediate"
          >提交处置修复</a-button>
          <span v-if="!canSubmitRemediate && selectedVulInfoIds.length" class="tab-warn">所选实例须均为 stat=1/2/7</span>
        </a-tab-pane>

        <a-tab-pane key="verifyFix" tab="修复核验">
          <p class="tab-desc">调用 <code>POST /instances/verify-fix:batch</code>，对已修复(5)的实例发起修复核验受理。</p>
          <a-button
            type="primary"
            :disabled="!canSubmitVerifyFix"
            :loading="acting"
            @click="submitVerifyFix"
          >提交修复核验受理</a-button>
          <span v-if="!canSubmitVerifyFix && selectedVulInfoIds.length" class="tab-warn">所选实例须均为 stat=5</span>
          <div class="workspace-link-row">
            <a-button type="link" @click="goVerifyFixJobs">前往修复核验工作台</a-button>
          </div>
        </a-tab-pane>
      </a-tabs>

      <div v-if="previewRequest" class="payload-preview">
        <div class="payload-title">将发送的请求体（{{ previewItemCount }} 条实例）</div>
        <pre class="payload-json">{{ previewJson }}</pre>
      </div>
    </a-card>
  </div>
</template>

<script>
import PartnerSessionPanel from '@/components/openPlatform/PartnerSessionPanel'
import EnumTag from '@/components/openPlatform/EnumTag'
import { labelWithCode } from '@/constants/openPlatformDisplay'
import {
  remediateInstanceBatch,
  verifyFixInstanceBatch,
  verifyInstanceBatch
} from '@/api/openPlatform/openPartnerApi'
import {
  buildRemediateBatchItem,
  buildVerifyBatchRequest,
  buildVerifyFixBatchItem
} from '@/api/openPlatform/e2eRunner'
import { getPartnerSession } from '@/utils/openPartnerRequest'
import { listOpsVulnInstances } from '@/api/openPlatform/openVulnInstance'
import { normalizeListPayload } from '@/utils/openApiPayload'

const OPS_OPERATOR = 'disposal-console@partner.local'

const instanceColumns = [
  { title: 'vulInfoID', dataIndex: 'vulInfoId', key: 'vulInfoId', ellipsis: true },
  { title: '漏洞状态', dataIndex: 'vulInfoStat', key: 'vulInfoStat', scopedSlots: { customRender: 'vulInfoStat' }, width: 120 },
  { title: '漏洞名', dataIndex: 'vulName', key: 'vulName', ellipsis: true },
  { title: '地址', dataIndex: 'vulNetAddr', key: 'vulNetAddr', width: 120, ellipsis: true },
  { title: '端口', dataIndex: 'vulPort', key: 'vulPort', width: 56 },
  { title: 'taskId', dataIndex: 'taskId', key: 'taskId', width: 130, ellipsis: true },
  { title: '待处理VF', dataIndex: 'pendingVerifyFixJobId', key: 'pendingVerifyFixJobId', width: 120, ellipsis: true }
]

export default {
  name: 'VerifyFixOps',
  components: { PartnerSessionPanel, EnumTag },
  data () {
    return {
      instanceColumns,
      activeTab: 'verify',
      verifyResult: 'VALID',
      sessionPartnerId: '',
      filterTaskId: '',
      filterStat: '',
      loadingInstances: false,
      acting: false,
      instances: [],
      selectedVulInfoIds: []
    }
  },
  computed: {
    initialPartnerId () {
      return (this.$route.query.partnerId || '').trim()
    },
    selectedRows () {
      const set = new Set(this.selectedVulInfoIds)
      return this.instances.filter(r => set.has(r.vulInfoId))
    },
    canSubmitVerify () {
      return this.selectedRows.length > 0 &&
        this.selectedRows.every(r => r.vulInfoStat === 0 || r.vulInfoStat === 1)
    },
    canSubmitRemediate () {
      return this.selectedRows.length > 0 &&
        this.selectedRows.every(r => [1, 2, 7].includes(r.vulInfoStat))
    },
    canSubmitVerifyFix () {
      return this.selectedRows.length > 0 &&
        this.selectedRows.every(r => r.vulInfoStat === 5)
    },
    vulInfoStatOptions () {
      return [1, 2, 3, 5, 6, 7].map(v => ({
        value: v,
        label: labelWithCode('vulInfoStat', v)
      }))
    },
    previewRequest () {
      if (!this.selectedVulInfoIds.length) return null
      if (this.activeTab === 'verify') {
        return buildVerifyBatchRequest(
          this.selectedVulInfoIds,
          this.verifyResult,
          OPS_OPERATOR
        )
      }
      if (this.activeTab === 'remediate') {
        return {
          items: this.selectedVulInfoIds.map(id => buildRemediateBatchItem(id))
        }
      }
      if (this.activeTab === 'verifyFix') {
        return {
          items: this.selectedVulInfoIds.map(id => buildVerifyFixBatchItem(id))
        }
      }
      return null
    },
    previewJson () {
      if (!this.previewRequest) return ''
      return JSON.stringify(this.previewRequest, null, 2)
    },
    previewItemCount () {
      const req = this.previewRequest
      return req && req.items ? req.items.length : 0
    },
    instanceRowSelection () {
      return {
        selectedRowKeys: this.selectedVulInfoIds,
        onChange: this.onInstanceSelectionChange
      }
    }
  },
  mounted () {
    const s = getPartnerSession()
    if (s.partnerId) this.sessionPartnerId = s.partnerId
    const qTask = (this.$route.query.taskId || '').trim()
    if (qTask) this.filterTaskId = qTask
    if (this.sessionPartnerId) {
      this.loadInstances()
    }
  },
  methods: {
    onInstanceSelectionChange (keys) {
      this.selectedVulInfoIds = keys
    },
    goVerifyFixJobs () {
      const query = {}
      if (this.sessionPartnerId) query.partnerId = this.sessionPartnerId
      if (this.filterTaskId) query.taskId = this.filterTaskId
      this.$router.push({ name: 'VerifyFixJobList', query })
    },
    resolvePartnerId () {
      const panel = this.$refs.partnerSession
      const fromPanel = panel && panel.getFormState ? panel.getFormState().partnerId : ''
      return (fromPanel || this.sessionPartnerId || '').trim()
    },
    onPartnerBound ({ partnerId }) {
      this.sessionPartnerId = partnerId
      this.loadInstances()
    },
    onPartnerChange ({ partnerId }) {
      if (partnerId) {
        this.sessionPartnerId = partnerId
        this.loadInstances()
      }
    },
    ensureSession () {
      const panel = this.$refs.partnerSession
      if (panel && panel.ensureSession()) return true
      return false
    },
    loadFixedInstances () {
      this.filterStat = 5
      this.loadInstances()
    },
    async loadInstances () {
      const partnerId = this.resolvePartnerId()
      if (!partnerId) {
        this.$message.warning('请先选择接入方')
        return
      }
      this.loadingInstances = true
      try {
        const options = { limit: 200 }
        if (this.filterTaskId) options.taskId = this.filterTaskId.trim()
        if (this.filterStat !== '' && this.filterStat != null) {
          options.vulInfoStat = this.filterStat
        }
        const data = await listOpsVulnInstances(partnerId, options)
        this.instances = normalizeListPayload(data)
        const validKeys = new Set(this.instances.map(r => r.vulInfoId))
        this.selectedVulInfoIds = this.selectedVulInfoIds.filter(k => validKeys.has(k))
      } catch (e) {
        this.instances = []
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '查询实例失败')
      } finally {
        this.loadingInstances = false
      }
    },
    async refreshAfterAction (okMsg) {
      this.$message.success(okMsg)
      await this.loadInstances()
    },
    async submitVerify () {
      if (!this.ensureSession()) return
      if (!this.canSubmitVerify) {
        this.$message.warning('所选实例须均为 stat=0/1')
        return
      }
      this.acting = true
      const runId = Date.now()
      try {
        const request = buildVerifyBatchRequest(
          this.selectedVulInfoIds,
          this.verifyResult,
          OPS_OPERATOR
        )
        const res = await verifyInstanceBatch(request, `disposal-v-${runId}`)
        const failed = (res && res.failed) || []
        if (failed.length) {
          throw new Error(failed.map(f => `${f.vulInfoID}: ${f.message}`).join('；'))
        }
        const label = this.verifyResult === 'VALID' ? '有效(2)' : '误报(3)'
        await this.refreshAfterAction(`已提交漏洞验证 ${request.items.length} 条 → ${label}`)
      } catch (e) {
        this.$message.error(e.message || '漏洞验证失败')
      } finally {
        this.acting = false
      }
    },
    async submitRemediate () {
      if (!this.ensureSession()) return
      if (!this.canSubmitRemediate) {
        this.$message.warning('所选实例须均为 stat=1/2/7')
        return
      }
      this.acting = true
      const runId = Date.now()
      try {
        const request = {
          items: this.selectedVulInfoIds.map(id => buildRemediateBatchItem(id))
        }
        const res = await remediateInstanceBatch(request, `disposal-r-${runId}`)
        const failed = (res && res.failed) || []
        if (failed.length) {
          throw new Error(failed.map(f => `${f.vulInfoID}: ${f.message}`).join('；'))
        }
        await this.refreshAfterAction(`已提交处置修复 ${request.items.length} 条 → stat=5`)
      } catch (e) {
        this.$message.error(e.message || '处置修复失败')
      } finally {
        this.acting = false
      }
    },
    async submitVerifyFix () {
      if (!this.ensureSession()) return
      if (!this.canSubmitVerifyFix) {
        this.$message.warning('所选实例须均为 stat=5')
        return
      }
      this.acting = true
      const runId = Date.now()
      try {
        const request = {
          items: this.selectedVulInfoIds.map(id => buildVerifyFixBatchItem(id))
        }
        const res = await verifyFixInstanceBatch(request, `disposal-vf-${runId}`)
        const failed = (res && res.failed) || []
        if (failed.length) {
          throw new Error(failed.map(f => `${f.vulInfoID}: ${f.message}`).join('；'))
        }
        await this.refreshAfterAction(`已提交修复核验受理 ${request.items.length} 条`)
      } catch (e) {
        this.$message.error(e.message || '修复核验受理失败')
      } finally {
        this.acting = false
      }
    }
  }
}
</script>

<style scoped>
.job-hint { margin-bottom: 12px; }
.workspace-link-row { margin-top: 8px; }
.job-hint.muted { color: rgba(0,0,0,.45); }
.muted-inline { color: rgba(0,0,0,.45); font-size: 13px; margin-left: 4px; }
.instance-filter-form { margin-bottom: 8px; }
.candidate-hint { margin-top: 8px; color: rgba(0,0,0,.55); font-size: 13px; }
.tab-desc { color: rgba(0,0,0,.65); margin-bottom: 12px; font-size: 13px; }
.tab-warn { margin-left: 12px; color: #fa8c16; font-size: 13px; }
.payload-preview { margin-top: 16px; border-top: 1px solid #f0f0f0; padding-top: 12px; }
.payload-title { font-size: 13px; color: rgba(0,0,0,.55); margin-bottom: 8px; }
.payload-json {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  max-height: 240px;
  overflow: auto;
  margin: 0;
}
.mock-env-collapse { background: #fff; }
.e2e-file-input { display: none; }
.e2e-file-name { margin-left: 8px; color: rgba(0,0,0,.65); }
::v-deep .row-selected { background: #e6f7ff; }
</style>

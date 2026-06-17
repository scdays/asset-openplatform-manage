<template>
  <div class="p_16 verify-fix-ops-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>修复核验运营</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      message="实例联调 + 修复核验运营（§5.3–§5.5）"
      description="从 open_vuln_instance 加载实例，多选后按需执行：验证有效/误报、处置修复、创建内部修复核验作业（一次核验多条）。完成作业后仅推送 INSTANCE_VERIFY_FIX_COMPLETED，不外发 VERIFY_FIX_SCAN。"
      style="margin: 16px 0;"
    />

    <partner-session-panel
      ref="partnerSession"
      :initial-partner-id="initialPartnerId"
      style="margin-bottom: 16px;"
      @bound="onPartnerBound"
      @partner-change="onPartnerChange"
    />

    <a-card title="漏洞实例（多选推进状态机）" :bordered="false" style="margin-bottom: 16px;">
      <a-form layout="inline" class="instance-filter-form">
        <a-form-item label="taskId（可选）">
          <a-input
            v-model="filterTaskId"
            placeholder="平台 TASK-xxx"
            style="width: 200px;"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="vulInfoStat">
          <a-select v-model="filterStat" style="width: 140px;" @change="onFilterStatChange">
            <a-select-option value="">全部</a-select-option>
            <a-select-option :value="1">1 初始发现</a-select-option>
            <a-select-option :value="2">2 已验证有效</a-select-option>
            <a-select-option :value="3">3 已验证误报</a-select-option>
            <a-select-option :value="5">5 已修复</a-select-option>
            <a-select-option :value="6">6 核验修复</a-select-option>
            <a-select-option :value="7">7 核验未修复</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="loadingInstances" @click="loadInstances">查询实例</a-button>
          <a-button style="margin-left: 8px;" @click="loadFixedInstances">仅已修复(5)</a-button>
        </a-form-item>
      </a-form>

      <div class="instance-action-bar">
        <a-button
          :disabled="!canVerifyValid"
          :loading="acting"
          @click="runVerifyValid"
        >验证有效 →2</a-button>
        <a-button
          style="margin-left: 8px;"
          :disabled="!canVerifyFalsePositive"
          :loading="acting"
          @click="runVerifyFalsePositive"
        >验证误报 →3</a-button>
        <a-button
          type="primary"
          style="margin-left: 8px;"
          :disabled="!canRemediate"
          :loading="acting"
          @click="runRemediate"
        >处置修复 →5</a-button>
        <a-button
          type="primary"
          style="margin-left: 8px;"
          :disabled="!canCreateVerifyFixJob"
          :loading="creatingJob"
          @click="createJobFromSelection"
        >创建修复核验内部作业</a-button>
        <span v-if="selectedVulInfoIds.length" class="candidate-hint">已选 {{ selectedVulInfoIds.length }} 条</span>
      </div>

      <a-table
        :columns="instanceColumns"
        :data-source="instances"
        row-key="vulInfoId"
        size="small"
        :loading="loadingInstances"
        :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10','20','50','100'] }"
        :row-selection="instanceRowSelection"
        style="margin-top: 12px;"
      />
      <p v-if="!loadingInstances && !instances.length" class="job-hint muted">
        暂无实例。请先绑定接入方，并完成离线导入或任务入库；筛选「已修复(5)」后可多选创建修复核验作业。
      </p>
    </a-card>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="10">
        <a-card title="运营：完成修复核验（选中内部作业）" :bordered="false">
          <p v-if="selectedJob" class="job-hint">
            当前作业：<code>{{ selectedJob.jobId }}</code>
            <a-tag :color="statusColor(selectedJob.status)" style="margin-left: 8px;">{{ selectedJob.status }}</a-tag>
            <span class="muted-inline">（{{ selectedJob.itemCount }} 条实例）</span>
          </p>
          <p v-else class="job-hint muted">请从右侧选择 PENDING 作业，或由上方多选 stat=5 实例创建作业</p>

          <div class="e2e-upload-row" style="margin-bottom: 12px;">
            <input
              ref="fileInput"
              type="file"
              accept=".xml,application/xml,text/xml"
              class="e2e-file-input"
              @change="onFileChange"
            />
            <a-button icon="upload" :disabled="!selectedJob" @click="pickFile">选择复扫 XML</a-button>
            <span v-if="xmlFileName" class="e2e-file-name">{{ xmlFileName }}</span>
          </div>

          <a-button-group>
            <a-button
              type="primary"
              :disabled="!selectedJob || !xmlFile"
              :loading="completing"
              @click="importAndComplete"
            >导入 XML 并比对完成</a-button>
            <a-button :disabled="!selectedJob" :loading="completing" @click="oneClickFixed">一键核验修复(6)</a-button>
            <a-button :disabled="!selectedJob" :loading="completing" @click="oneClickUnfixed">一键核验未修复(7)</a-button>
            <a-button :disabled="!selectedJob" :loading="completing" @click="compareComplete">按已有报告比对</a-button>
          </a-button-group>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="14">
        <a-card title="内部修复核验作业" :bordered="false">
          <a-button size="small" style="margin-bottom: 8px;" :loading="loadingJobs" @click="loadJobs">刷新</a-button>
          <a-table
            :columns="jobColumns"
            :data-source="jobs"
            row-key="jobId"
            size="small"
            :loading="loadingJobs"
            :pagination="false"
            :row-class-name="rowClassName"
            :custom-row="customRow"
          />
        </a-card>

        <a-card v-if="selectedJob && selectedJob.items && selectedJob.items.length" title="作业目标实例" :bordered="false" style="margin-top: 16px;">
          <a-table
            :columns="itemColumns"
            :data-source="selectedJob.items"
            row-key="vulInfoId"
            size="small"
            :pagination="false"
          />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import PartnerSessionPanel from '@/components/openPlatform/PartnerSessionPanel'
import {
  remediateInstanceBatch,
  verifyInstanceBatch
} from '@/api/openPlatform/openPartnerApi'
import { buildRemediateBody } from '@/api/openPlatform/e2eRunner'
import { getPartnerSession } from '@/utils/openPartnerRequest'
import {
  listVerifyFixJobs,
  getVerifyFixJob,
  importVerifyFixRescanXml,
  completeVerifyFixAllFixed,
  completeVerifyFixAllUnfixed,
  completeVerifyFixByCompare,
  listMockVulnInstances,
  createVerifyFixJobFromSelection
} from '@/api/openPlatform/mockVerifyFix'
import { normalizeListPayload } from '@/utils/openApiPayload'

const OPS_OPERATOR = 'verify-fix-ops@console.local'

const jobColumns = [
  { title: 'jobId', dataIndex: 'jobId', key: 'jobId', width: 140 },
  { title: 'partnerId', dataIndex: 'partnerId', key: 'partnerId', ellipsis: true },
  { title: 'status', dataIndex: 'status', key: 'status', width: 90 },
  { title: '条数', dataIndex: 'itemCount', key: 'itemCount', width: 60 },
  { title: '已导入XML', dataIndex: 'rescanImported', key: 'rescanImported', width: 90, customRender: t => (t ? '是' : '否') },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 }
]

const itemColumns = [
  { title: 'vulInfoID', dataIndex: 'vulInfoId', key: 'vulInfoId' },
  { title: 'taskId', dataIndex: 'taskId', key: 'taskId' },
  { title: '前状态', dataIndex: 'previousStat', key: 'previousStat', width: 70 },
  { title: '结果', dataIndex: 'resultStat', key: 'resultStat', width: 70 },
  { title: '条目状态', dataIndex: 'itemStatus', key: 'itemStatus', width: 90 }
]

const instanceColumns = [
  { title: 'vulInfoID', dataIndex: 'vulInfoId', key: 'vulInfoId', ellipsis: true },
  { title: 'stat', dataIndex: 'vulInfoStat', key: 'vulInfoStat', width: 56 },
  { title: '漏洞名', dataIndex: 'vulName', key: 'vulName', ellipsis: true },
  { title: '地址', dataIndex: 'vulNetAddr', key: 'vulNetAddr', width: 120, ellipsis: true },
  { title: '端口', dataIndex: 'vulPort', key: 'vulPort', width: 56 },
  { title: 'taskId', dataIndex: 'taskId', key: 'taskId', width: 130, ellipsis: true },
  { title: '待处理VF', dataIndex: 'pendingVerifyFixJobId', key: 'pendingVerifyFixJobId', width: 120, ellipsis: true }
]

function buildTransferTime () {
  return String(Math.floor(Date.now() / 1000))
}

export default {
  name: 'VerifyFixOps',
  components: { PartnerSessionPanel },
  data () {
    return {
      jobColumns,
      itemColumns,
      instanceColumns,
      sessionPartnerId: '',
      filterTaskId: '',
      filterStat: 5,
      loadingJobs: false,
      loadingInstances: false,
      acting: false,
      creatingJob: false,
      completing: false,
      jobs: [],
      instances: [],
      selectedVulInfoIds: [],
      selectedJob: null,
      xmlFile: null,
      xmlFileName: ''
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
    canVerifyValid () {
      return this.selectedRows.length > 0
        && this.selectedRows.every(r => r.vulInfoStat === 0 || r.vulInfoStat === 1)
    },
    canVerifyFalsePositive () {
      return this.selectedRows.length > 0
        && this.selectedRows.every(r => r.vulInfoStat === 0 || r.vulInfoStat === 1)
    },
    canRemediate () {
      return this.selectedRows.length > 0
        && this.selectedRows.every(r => [1, 2, 7].includes(r.vulInfoStat))
    },
    canCreateVerifyFixJob () {
      return this.selectedRows.length > 0
        && this.selectedRows.every(r => r.vulInfoStat === 5)
    },
    instanceRowSelection () {
      return {
        selectedRowKeys: this.selectedVulInfoIds,
        onChange: keys => { this.selectedVulInfoIds = keys }
      }
    }
  },
  mounted () {
    const s = getPartnerSession()
    if (s.partnerId) this.sessionPartnerId = s.partnerId
    const qTask = (this.$route.query.taskId || '').trim()
    if (qTask) this.filterTaskId = qTask
    this.loadJobs()
    if (this.sessionPartnerId) {
      this.loadInstances()
    }
  },
  methods: {
    resolvePartnerId () {
      const panel = this.$refs.partnerSession
      const fromPanel = panel && panel.getFormState ? panel.getFormState().partnerId : ''
      return (fromPanel || this.sessionPartnerId || '').trim()
    },
    onPartnerBound ({ partnerId }) {
      this.sessionPartnerId = partnerId
      this.loadJobs()
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
    onFilterStatChange () {
      // 用户改筛选后不自动查询，避免误触
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
        const data = await listMockVulnInstances(partnerId, options)
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
      await this.loadJobs()
    },
    async runVerifyValid () {
      if (!this.ensureSession()) return
      if (!this.canVerifyValid) {
        this.$message.warning('所选实例须均为 stat=0/1')
        return
      }
      this.acting = true
      const runId = Date.now()
      try {
        const items = this.selectedVulInfoIds.map(vulInfoID => ({
          vulInfoID,
          verifyResult: 'VALID',
          srcMethod: 1021,
          operator: OPS_OPERATOR,
          transferTime: buildTransferTime()
        }))
        const res = await verifyInstanceBatch(items, `ops-v-valid-${runId}`)
        const failed = (res && res.failed) || []
        if (failed.length) {
          throw new Error(failed.map(f => `${f.vulInfoID}: ${f.message}`).join('；'))
        }
        await this.refreshAfterAction(`已验证有效 ${this.selectedVulInfoIds.length} 条 → stat=2`)
      } catch (e) {
        this.$message.error(e.message || '验证失败')
      } finally {
        this.acting = false
      }
    },
    async runVerifyFalsePositive () {
      if (!this.ensureSession()) return
      if (!this.canVerifyFalsePositive) {
        this.$message.warning('所选实例须均为 stat=0/1')
        return
      }
      this.acting = true
      const runId = Date.now()
      try {
        const items = this.selectedVulInfoIds.map(vulInfoID => ({
          vulInfoID,
          verifyResult: 'FALSE_POSITIVE',
          operator: OPS_OPERATOR,
          transferTime: buildTransferTime()
        }))
        const res = await verifyInstanceBatch(items, `ops-v-fp-${runId}`)
        const failed = (res && res.failed) || []
        if (failed.length) {
          throw new Error(failed.map(f => `${f.vulInfoID}: ${f.message}`).join('；'))
        }
        await this.refreshAfterAction(`已标记误报 ${this.selectedVulInfoIds.length} 条 → stat=3`)
      } catch (e) {
        this.$message.error(e.message || '误报标记失败')
      } finally {
        this.acting = false
      }
    },
    async runRemediate () {
      if (!this.ensureSession()) return
      if (!this.canRemediate) {
        this.$message.warning('所选实例须均为 stat=1/2/7')
        return
      }
      this.acting = true
      const runId = Date.now()
      try {
        const items = this.selectedVulInfoIds.map(vulInfoID => ({
          vulInfoID,
          ...buildRemediateBody({ remedDesc: `ops remediate ${vulInfoID}` })
        }))
        const res = await remediateInstanceBatch(items, `ops-r-${runId}`)
        const failed = (res && res.failed) || []
        if (failed.length) {
          throw new Error(failed.map(f => `${f.vulInfoID}: ${f.message}`).join('；'))
        }
        await this.refreshAfterAction(`已处置修复 ${this.selectedVulInfoIds.length} 条 → stat=5`)
      } catch (e) {
        this.$message.error(e.message || '处置修复失败')
      } finally {
        this.acting = false
      }
    },
    async createJobFromSelection () {
      const partnerId = this.resolvePartnerId()
      if (!partnerId) {
        this.$message.warning('请先选择接入方')
        return
      }
      if (!this.canCreateVerifyFixJob) {
        this.$message.warning('创建修复核验作业须选择 stat=5（已修复）的实例')
        return
      }
      this.creatingJob = true
      try {
        const job = await createVerifyFixJobFromSelection({
          partnerId,
          vulInfoIds: this.selectedVulInfoIds
        })
        const jobId = job && job.jobId
        this.$message.success(jobId
          ? `内部作业已就绪：${jobId}（${this.selectedVulInfoIds.length} 条）`
          : '作业已创建')
        await this.loadJobs()
        await this.loadInstances()
        if (jobId) {
          await this.selectJob(jobId)
        }
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '创建作业失败')
      } finally {
        this.creatingJob = false
      }
    },
    statusColor (status) {
      if (status === 'FINISHED') return 'green'
      if (status === 'FAILED') return 'red'
      if (status === 'RUNNING') return 'blue'
      return 'orange'
    },
    rowClassName (record) {
      return this.selectedJob && this.selectedJob.jobId === record.jobId ? 'row-selected' : ''
    },
    customRow (record) {
      return {
        on: {
          click: () => this.selectJob(record.jobId)
        }
      }
    },
    async loadJobs () {
      this.loadingJobs = true
      try {
        const params = { status: '', limit: 50 }
        const partnerId = this.resolvePartnerId()
        if (partnerId) params.partnerId = partnerId
        const data = await listVerifyFixJobs(params)
        this.jobs = normalizeListPayload(data)
        if (this.selectedJob) {
          const hit = this.jobs.find(j => j.jobId === this.selectedJob.jobId)
          if (hit) {
            await this.selectJob(hit.jobId)
          }
        }
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '加载作业失败')
      } finally {
        this.loadingJobs = false
      }
    },
    async selectJob (jobId) {
      try {
        const job = await getVerifyFixJob(jobId)
        this.selectedJob = job
      } catch (e) {
        this.$message.error('加载作业详情失败')
      }
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
      if (!this.selectedJob) return
      this.completing = true
      try {
        await fn(this.selectedJob.jobId)
        this.$message.success(okMsg)
        await this.loadJobs()
        await this.loadInstances()
        await this.selectJob(this.selectedJob.jobId)
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '操作失败')
      } finally {
        this.completing = false
      }
    },
    importAndComplete () {
      if (!this.xmlFile) {
        this.$message.warning('请先选择复扫 XML')
        return
      }
      this.runComplete(id => importVerifyFixRescanXml(id, this.xmlFile), '导入并完成，已触发 Webhook')
    },
    oneClickFixed () {
      this.runComplete(completeVerifyFixAllFixed, '已全部标记为核验修复(6)')
    },
    oneClickUnfixed () {
      this.runComplete(completeVerifyFixAllUnfixed, '已全部标记为核验未修复(7)')
    },
    compareComplete () {
      this.runComplete(completeVerifyFixByCompare, '已按报告比对完成')
    }
  }
}
</script>

<style scoped>
.job-hint { margin-bottom: 12px; }
.job-hint.muted { color: rgba(0,0,0,.45); }
.muted-inline { color: rgba(0,0,0,.45); font-size: 13px; margin-left: 4px; }
.instance-filter-form { margin-bottom: 8px; }
.instance-action-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.candidate-hint { margin-left: 12px; color: rgba(0,0,0,.55); font-size: 13px; }
.e2e-file-input { display: none; }
.e2e-file-name { margin-left: 8px; color: rgba(0,0,0,.65); }
::v-deep .row-selected { background: #e6f7ff; }
</style>

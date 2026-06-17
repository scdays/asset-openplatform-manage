<template>
  <div class="p_16 verify-fix-ops-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>修复核验运营</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      message="修复核验 Mock 运营（§5.5）"
      description="接入方调用 verify-fix（可多次）后，在下方从调用记录加载待核验实例，多选创建/归入内部作业，再导入复扫 XML 完成核验。仅推送 INSTANCE_VERIFY_FIX_COMPLETED，不外发 VERIFY_FIX_SCAN。"
      style="margin: 16px 0;"
    />

    <partner-session-panel
      ref="partnerSession"
      :initial-partner-id="initialPartnerId"
      style="margin-bottom: 16px;"
      @bound="onPartnerBound"
      @partner-change="onPartnerChange"
    />

    <a-card title="从 Partner 调用记录加载待核验实例" :bordered="false" style="margin-bottom: 16px;">
      <div class="candidate-toolbar">
        <a-button type="primary" :loading="loadingCandidates" @click="loadCandidates">刷新调用记录</a-button>
        <a-button
          type="primary"
          :disabled="!selectedVulInfoIds.length"
          :loading="creatingJob"
          style="margin-left: 8px;"
          @click="createJobFromSelection"
        >为所选创建/归入内部作业</a-button>
        <span v-if="selectedVulInfoIds.length" class="candidate-hint">已选 {{ selectedVulInfoIds.length }} 条</span>
      </div>
      <a-table
        :columns="candidateColumns"
        :data-source="candidates"
        row-key="vulInfoId"
        size="small"
        :loading="loadingCandidates"
        :pagination="false"
        :row-selection="candidateRowSelection"
        style="margin-top: 12px;"
      />
      <p v-if="!loadingCandidates && !candidates.length" class="job-hint muted">
        暂无成功的 verify-fix 调用记录。请先在上方绑定接入方，并由 Partner 调用 verify-fix（本页左侧也可模拟提交）。
      </p>
    </a-card>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="10">
        <a-card title="Partner 侧：发起修复核验（联调）" :bordered="false" style="margin-bottom: 16px;">
          <a-form layout="vertical">
            <a-form-item label="vulInfoID">
              <a-input v-model="vulInfoId" placeholder="实例 ID" />
            </a-form-item>
            <a-form-item label="备注（可选）">
              <a-input v-model="remark" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" :loading="submitting" @click="submit">提交 verify-fix</a-button>
              <a-button style="margin-left: 8px;" @click="loadJobs">刷新任务</a-button>
            </a-form-item>
          </a-form>
        </a-card>

        <a-card title="运营：完成核验（选中任务）" :bordered="false">
          <p v-if="selectedJob" class="job-hint">
            当前任务：<code>{{ selectedJob.jobId }}</code>
            <a-tag :color="statusColor(selectedJob.status)" style="margin-left: 8px;">{{ selectedJob.status }}</a-tag>
          </p>
          <p v-else class="job-hint muted">请从右侧列表选择 PENDING 任务，或由上方多选创建作业</p>

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
        <a-card title="内部修复核验任务" :bordered="false">
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

        <a-card v-if="selectedJob && selectedJob.items && selectedJob.items.length" title="目标实例" :bordered="false" style="margin-top: 16px;">
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
import { verifyFixInstance } from '@/api/openPlatform/openPartnerApi'
import { getPartnerSession } from '@/utils/openPartnerRequest'
import {
  listVerifyFixJobs,
  getVerifyFixJob,
  importVerifyFixRescanXml,
  completeVerifyFixAllFixed,
  completeVerifyFixAllUnfixed,
  completeVerifyFixByCompare,
  listVerifyFixInvocationCandidates,
  createVerifyFixJobFromSelection
} from '@/api/openPlatform/mockVerifyFix'
import { normalizeListPayload } from '@/utils/openApiPayload'

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

const candidateColumns = [
  { title: 'vulInfoID', dataIndex: 'vulInfoId', key: 'vulInfoId', ellipsis: true },
  { title: 'stat', dataIndex: 'vulInfoStat', key: 'vulInfoStat', width: 56 },
  { title: 'verifyFixJobId', dataIndex: 'verifyFixJobId', key: 'verifyFixJobId', width: 150, ellipsis: true },
  { title: '作业状态', dataIndex: 'jobStatus', key: 'jobStatus', width: 88 },
  { title: 'taskId', dataIndex: 'taskId', key: 'taskId', width: 140, ellipsis: true },
  { title: '调用时间', dataIndex: 'invokedAt', key: 'invokedAt', width: 168 }
]

export default {
  name: 'VerifyFixOps',
  components: { PartnerSessionPanel },
  data () {
    return {
      jobColumns,
      itemColumns,
      candidateColumns,
      sessionPartnerId: '',
      vulInfoId: '',
      remark: '',
      submitting: false,
      completing: false,
      loadingJobs: false,
      loadingCandidates: false,
      creatingJob: false,
      jobs: [],
      candidates: [],
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
    candidateRowSelection () {
      return {
        selectedRowKeys: this.selectedVulInfoIds,
        onChange: keys => { this.selectedVulInfoIds = keys },
        getCheckboxProps: record => ({
          props: { disabled: record.vulInfoStat != null && record.vulInfoStat !== 5 }
        })
      }
    }
  },
  mounted () {
    const s = getPartnerSession()
    if (s.partnerId) this.sessionPartnerId = s.partnerId
    this.loadJobs()
    if (this.sessionPartnerId) {
      this.loadCandidates()
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
      this.loadCandidates()
    },
    onPartnerChange ({ partnerId }) {
      if (partnerId) {
        this.sessionPartnerId = partnerId
        this.loadCandidates()
      }
    },
    ensureSession () {
      const panel = this.$refs.partnerSession
      if (panel && panel.ensureSession()) return true
      return false
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
    async loadCandidates () {
      const partnerId = this.resolvePartnerId()
      if (!partnerId) {
        this.$message.warning('请先选择接入方')
        return
      }
      this.loadingCandidates = true
      try {
        const data = await listVerifyFixInvocationCandidates(partnerId, 100)
        this.candidates = normalizeListPayload(data)
        const validKeys = new Set(this.candidates.map(r => r.vulInfoId))
        this.selectedVulInfoIds = this.selectedVulInfoIds.filter(k => validKeys.has(k))
      } catch (e) {
        this.candidates = []
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '加载调用记录失败')
      } finally {
        this.loadingCandidates = false
      }
    },
    async createJobFromSelection () {
      const partnerId = this.resolvePartnerId()
      if (!partnerId) {
        this.$message.warning('请先选择接入方')
        return
      }
      if (!this.selectedVulInfoIds.length) {
        this.$message.warning('请至少选择一条实例')
        return
      }
      this.creatingJob = true
      try {
        const job = await createVerifyFixJobFromSelection({
          partnerId,
          vulInfoIds: this.selectedVulInfoIds
        })
        const jobId = job && job.jobId
        this.$message.success(jobId ? `作业已就绪：${jobId}` : '作业已创建')
        await this.loadJobs()
        await this.loadCandidates()
        if (jobId) {
          await this.selectJob(jobId)
        }
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '创建作业失败')
      } finally {
        this.creatingJob = false
      }
    },
    async loadJobs () {
      this.loadingJobs = true
      try {
        const params = { status: '', limit: 50 }
        if (this.sessionPartnerId) params.partnerId = this.sessionPartnerId
        const data = await listVerifyFixJobs(params)
        this.jobs = normalizeListPayload(data)
        if (this.selectedJob) {
          const hit = this.jobs.find(j => j.jobId === this.selectedJob.jobId)
          if (hit) {
            await this.selectJob(hit.jobId)
          }
        }
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '加载任务失败')
      } finally {
        this.loadingJobs = false
      }
    },
    async selectJob (jobId) {
      try {
        const job = await getVerifyFixJob(jobId)
        this.selectedJob = job
      } catch (e) {
        this.$message.error('加载任务详情失败')
      }
    },
    async submit () {
      if (!this.vulInfoId) {
        this.$message.warning('请填写 vulInfoID')
        return
      }
      if (!this.ensureSession()) return
      this.submitting = true
      const idem = `verify-fix:${this.vulInfoId}:${Date.now()}`
      try {
        const body = {}
        if (this.remark) body.remark = this.remark
        const res = await verifyFixInstance(this.vulInfoId, body, idem)
        const data = res && res.data ? res.data : res
        this.$message.success(data.verifyFixJobId ? `已受理 ${data.verifyFixJobId}` : '已提交')
        await this.loadJobs()
        await this.loadCandidates()
        if (data.verifyFixJobId) {
          await this.selectJob(data.verifyFixJobId)
        }
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.message) || e.message
        this.$message.error(msg || '提交失败')
      } finally {
        this.submitting = false
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
        await this.loadCandidates()
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
.candidate-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.candidate-hint { margin-left: 12px; color: rgba(0,0,0,.55); font-size: 13px; }
.e2e-file-input { display: none; }
.e2e-file-name { margin-left: 8px; color: rgba(0,0,0,.65); }
::v-deep .row-selected { background: #e6f7ff; }
</style>

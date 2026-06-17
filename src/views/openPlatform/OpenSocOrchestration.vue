<template>
  <div class="p_16 soc-orch-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>SOC 编排监控</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      message="SOC 修复核验编排（平台内部任务）"
      description="本页不调用 Partner API 建扫任务。基于半人工离线导入的系统漏洞实例，创建平台内部修复核验任务 → 导入复扫 XML 比对 → 实例跃迁 6/7，仅推送 INSTANCE_VERIFY_FIX_COMPLETED，不外发 VERIFY_FIX_SCAN / EXPORT_READY。"
      style="margin: 16px 0;"
    />

    <a-alert
      v-if="!adminKeyReady"
      type="warning"
      show-icon
      message="未配置 Admin Key"
      description="请在 .env.development.local 设置 VUE_APP_OPEN_API_ADMIN_KEY，否则无法调用内部编排 API。"
      style="margin-bottom: 16px;"
    />

    <partner-session-panel
      ref="partnerSession"
      :initial-partner-id="initialPartnerId"
      hint-title="选择接入方（用于 Webhook 投递）"
      hint-desc="内部修复核验不经 Partner API 建任务；仅需 partnerId 关联离线任务与回调。Token 可选（查看调用记录时用）。"
      style="margin-bottom: 16px;"
      @partner-change="onPartnerChange"
    />

    <a-card title="1. 关联离线导入任务" :bordered="false" style="margin-bottom: 16px;">
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="16">
            <a-form-item label="平台 taskId（半人工导入后）">
              <a-input
                v-model="taskIdInput"
                placeholder="来自 Mock 全流程 / 半人工导入页的 taskId"
                allow-clear
                @pressEnter="loadContext"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label=" ">
              <a-button type="primary" :loading="loadingContext" @click="loadContext">加载任务上下文</a-button>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <template v-if="context">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="taskId"><code>{{ context.taskId }}</code></a-descriptions-item>
          <a-descriptions-item label="extTaskId">{{ context.extTaskId || '-' }}</a-descriptions-item>
          <a-descriptions-item label="任务状态">{{ context.taskStatus || '-' }}</a-descriptions-item>
          <a-descriptions-item label="已入库">{{ context.instancesIngested ? '是' : '否' }}</a-descriptions-item>
          <a-descriptions-item label="库内实例数">{{ context.persistedInstanceCount != null ? context.persistedInstanceCount : '-' }}</a-descriptions-item>
          <a-descriptions-item label="source.xml">{{ context.hasSourceXml ? '有' : '无' }}</a-descriptions-item>
          <a-descriptions-item label="stat=5 可核验" :span="2">
            {{ (context.eligibleVulInfoIds || []).length }} 条
            <span v-if="context.statCounts" class="stat-hint">
              （分布：{{ formatStatCounts(context.statCounts) }}）
            </span>
          </a-descriptions-item>
        </a-descriptions>
        <p v-if="!(context.eligibleVulInfoIds || []).length" class="soc-hint warn">
          无 stat=5 实例：请先在 Mock 全流程或 Partner API 完成「验证→处置修复」，使实例处于已修复(5) 后再创建内部核验任务。
        </p>
      </template>
    </a-card>

    <a-card title="2. 创建平台内部修复核验任务" :bordered="false" style="margin-bottom: 16px;">
      <p class="soc-hint">创建的是 open_verify_fix_job 内部任务，Partner 侧无扫网任务感知。</p>
      <a-button
        type="primary"
        :loading="creatingJob"
        :disabled="!canCreateJob"
        @click="createInternalJob"
      >创建内部修复核验任务</a-button>
      <a-button style="margin-left: 8px;" :disabled="!jobId" :loading="polling" @click="refreshJob">刷新任务</a-button>
    </a-card>

    <a-card v-if="jobId" title="3. 修复核验进度" :bordered="false" style="margin-bottom: 16px;">
      <p>verifyFixJobId：<code>{{ jobId }}</code></p>
      <p>status：<a-tag :color="jobStatusColor">{{ jobStatus || '-' }}</a-tag> · 条目：{{ jobItemCount }}</p>
      <a-table
        v-if="jobItems.length"
        :columns="itemColumns"
        :data-source="jobItems"
        row-key="vulInfoId"
        size="small"
        :pagination="false"
        style="margin-top: 12px;"
      />
    </a-card>

    <a-card v-if="jobId && jobStatus === 'PENDING'" title="4. 复扫比对并完成（→6/7）" :bordered="false" style="margin-bottom: 16px;">
      <a-alert
        type="warning"
        show-icon
        message="仅 Webhook，不外发"
        description="完成后只推送 INSTANCE_VERIFY_FIX_COMPLETED；不会触发 VERIFY_FIX_SCAN 外发。"
        style="margin-bottom: 12px;"
      />
      <div class="soc-upload-row">
        <input
          ref="fileInput"
          type="file"
          accept=".xml,application/xml,text/xml"
          class="soc-file-input"
          @change="onFileChange"
        />
        <a-button icon="upload" @click="pickFile">选择复扫 XML</a-button>
        <span v-if="xmlFileName" class="soc-file-name">{{ xmlFileName }}</span>
      </div>
      <a-button-group style="margin-top: 12px;">
        <a-button
          type="primary"
          :disabled="!xmlFile"
          :loading="completing"
          @click="importAndComplete"
        >导入 XML 并比对完成</a-button>
        <a-button :loading="completing" @click="compareWithBundle">按离线 bundle 比对</a-button>
        <a-button :loading="completing" @click="oneClickFixed">一键 →6</a-button>
        <a-button :loading="completing" @click="oneClickUnfixed">一键 →7</a-button>
      </a-button-group>
    </a-card>

    <a-card v-if="jobId" title="接下来做什么？" :bordered="false">
      <a-alert
        :type="nextStepAlert.type"
        show-icon
        :message="nextStepAlert.title"
        :description="nextStepAlert.desc"
        style="margin-bottom: 16px;"
      />
      <ol class="soc-next-steps">
        <li v-for="(step, idx) in nextSteps" :key="idx">{{ step }}</li>
      </ol>
      <div class="soc-quick-links">
        <a-button size="small" @click="goManualIngest">半人工导入</a-button>
        <a-button size="small" @click="goMockE2e">Mock 全流程</a-button>
        <a-button size="small" @click="goWebhookLog">Webhook 日志</a-button>
        <a-button size="small" @click="goVerifyFixOps">修复核验运营</a-button>
      </div>
    </a-card>
  </div>
</template>

<script>
import PartnerSessionPanel from '@/components/openPlatform/PartnerSessionPanel'
import {
  completeVerifyFixAllFixed,
  completeVerifyFixAllUnfixed,
  completeVerifyFixByCompare,
  createInternalVerifyFixJob,
  getOfflineTaskVerifyFixContext,
  getVerifyFixJob,
  importVerifyFixRescanXml
} from '@/api/openPlatform/mockVerifyFix'
import { hasOpenApiAdminKey } from '@/utils/openPlatformRuntime'
import { loadSocTaskSession, saveSocTaskSession } from '@/utils/socTaskSessionStorage'

const itemColumns = [
  { title: 'vulInfoID', dataIndex: 'vulInfoId', key: 'vulInfoId' },
  { title: '原状态', dataIndex: 'previousStat', key: 'previousStat', width: 80 },
  { title: '结果', dataIndex: 'resultStat', key: 'resultStat', width: 80 },
  { title: '条目状态', dataIndex: 'itemStatus', key: 'itemStatus', width: 100 }
]

export default {
  name: 'OpenSocOrchestration',
  components: { PartnerSessionPanel },
  data () {
    return {
      taskIdInput: '',
      partnerId: '',
      loadingContext: false,
      creatingJob: false,
      completing: false,
      polling: false,
      pollTimer: null,
      context: null,
      jobId: '',
      jobStatus: '',
      jobItemCount: 0,
      jobItems: [],
      xmlFile: null,
      xmlFileName: '',
      itemColumns
    }
  },
  computed: {
    initialPartnerId () {
      return (this.$route.query.partnerId || '').trim()
    },
    adminKeyReady () {
      return hasOpenApiAdminKey()
    },
    canCreateJob () {
      return this.adminKeyReady &&
        this.partnerId &&
        this.context &&
        (this.context.eligibleVulInfoIds || []).length > 0
    },
    jobStatusColor () {
      if (this.jobStatus === 'FINISHED') return 'green'
      if (this.jobStatus === 'FAILED') return 'red'
      if (this.jobStatus === 'RUNNING') return 'blue'
      return 'default'
    },
    nextStepAlert () {
      if (this.jobStatus === 'FINISHED') {
        return {
          type: 'success',
          title: '修复核验已完成',
          desc: '实例应已跃迁为 6 或 7。请到 Webhook 日志确认 INSTANCE_VERIFY_FIX_COMPLETED，不应出现 VERIFY_FIX_SCAN 外发。'
        }
      }
      if (this.jobStatus === 'FAILED') {
        return {
          type: 'error',
          title: '修复核验失败',
          desc: '请查看任务 errorMessage 或重试导入复扫 XML。'
        }
      }
      if (this.jobId) {
        return {
          type: 'info',
          title: '内部任务已创建（PENDING）',
          desc: '请上传复扫 XML 并比对完成，或使用一键 →6/→7（联调）。'
        }
      }
      return {
        type: 'warning',
        title: '先完成离线导入与实例 stat=5',
        desc: '在半人工导入页入库后，确保目标实例已处置为 stat=5，再创建内部修复核验任务。'
      }
    },
    nextSteps () {
      if (this.jobStatus === 'FINISHED') {
        return [
          '打开 Webhook 日志，筛选 INSTANCE_VERIFY_FIX_COMPLETED',
          '确认实例 vulInfoStat 为 6（核验修复）或 7（核验未修复）',
          '确认无 VERIFY_FIX_SCAN / EXPORT_READY 外发记录'
        ]
      }
      if (this.jobId) {
        return [
          '上传修复后复扫 XML →「导入 XML 并比对完成」',
          '或「按离线 bundle 比对」（使用任务目录已有报告，联调用）',
          '完成后刷新任务状态，再去 Webhook 日志验收'
        ]
      }
      return [
        'Mock 全流程或半人工导入：完成 XML 入库并得到 taskId',
        '实例链路：验证(2) → 处置修复(5)',
        '回到本页：选接入方 → 加载 taskId → 创建内部修复核验任务'
      ]
    }
  },
  created () {
    const saved = loadSocTaskSession()
    if (saved) {
      if (saved.taskId) this.taskIdInput = saved.taskId
      if (saved.jobId) this.jobId = saved.jobId
      if (saved.partnerId) this.partnerId = saved.partnerId
    }
    const qTaskId = (this.$route.query.taskId || '').trim()
    if (qTaskId) this.taskIdInput = qTaskId
  },
  mounted () {
    if (this.taskIdInput && this.partnerId) {
      this.loadContext()
    }
    if (this.jobId) {
      this.refreshJob()
      this.startPoll()
    }
  },
  beforeDestroy () {
    this.stopPoll()
  },
  methods: {
    resolvePartnerId () {
      const panel = this.$refs.partnerSession
      const fromPanel = panel && panel.getFormState ? panel.getFormState().partnerId : ''
      return (fromPanel || this.partnerId || '').trim()
    },
    onPartnerChange (payload) {
      this.partnerId = (payload && payload.partnerId) || ''
      if (this.taskIdInput && this.partnerId) {
        this.loadContext()
      }
    },
    formatStatCounts (counts) {
      return Object.keys(counts).map(k => `stat${k}×${counts[k]}`).join('，')
    },
    async loadContext () {
      const partnerId = this.resolvePartnerId()
      const taskId = (this.taskIdInput || '').trim()
      if (!partnerId) {
        this.$message.warning('请先选择接入方')
        return
      }
      if (!taskId) {
        this.$message.warning('请输入 taskId')
        return
      }
      this.loadingContext = true
      try {
        this.context = await getOfflineTaskVerifyFixContext(partnerId, taskId)
        this.partnerId = partnerId
        saveSocTaskSession({ taskId, partnerId, extTaskId: this.context.extTaskId })
      } catch (e) {
        this.context = null
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '加载失败')
      } finally {
        this.loadingContext = false
      }
    },
    async createInternalJob () {
      const partnerId = this.resolvePartnerId()
      const taskId = (this.taskIdInput || '').trim()
      if (!this.canCreateJob) return
      this.creatingJob = true
      try {
        const job = await createInternalVerifyFixJob({
          partnerId,
          taskId,
          vulInfoIds: this.context.eligibleVulInfoIds
        })
        this.jobId = job.jobId
        this.jobStatus = job.status
        this.jobItemCount = job.itemCount
        this.jobItems = job.items || []
        saveSocTaskSession({
          taskId,
          partnerId,
          extTaskId: this.context.extTaskId,
          jobId: this.jobId
        })
        this.$message.success(`内部任务已创建：${this.jobId}`)
        this.startPoll()
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '创建失败')
      } finally {
        this.creatingJob = false
      }
    },
    async refreshJob () {
      if (!this.jobId) return
      this.polling = true
      try {
        const job = await getVerifyFixJob(this.jobId)
        this.jobStatus = job.status
        this.jobItemCount = job.itemCount
        this.jobItems = job.items || []
        if (job.status === 'FINISHED' || job.status === 'FAILED') {
          this.stopPoll()
        }
      } catch (e) {
        this.$message.error('查询任务失败')
      } finally {
        this.polling = false
      }
    },
    startPoll () {
      this.stopPoll()
      this.pollTimer = setInterval(() => this.refreshJob(), 5000)
    },
    stopPoll () {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    pickFile () {
      const input = this.$refs.fileInput
      if (input) input.click()
    },
    onFileChange (event) {
      const file = event.target && event.target.files && event.target.files[0]
      if (!file) return
      this.xmlFile = file
      this.xmlFileName = file.name
    },
    async importAndComplete () {
      if (!this.jobId || !this.xmlFile) return
      this.completing = true
      try {
        await importVerifyFixRescanXml(this.jobId, this.xmlFile)
        this.$message.success('已导入复扫 XML 并完成比对')
        await this.refreshJob()
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '完成失败')
      } finally {
        this.completing = false
      }
    },
    async compareWithBundle () {
      if (!this.jobId) return
      this.completing = true
      try {
        await completeVerifyFixByCompare(this.jobId)
        this.$message.success('已按 bundle 报告比对完成')
        await this.refreshJob()
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '比对失败')
      } finally {
        this.completing = false
      }
    },
    async oneClickFixed () {
      if (!this.jobId) return
      this.completing = true
      try {
        await completeVerifyFixAllFixed(this.jobId)
        this.$message.success('已全部标记为核验修复(6)')
        await this.refreshJob()
      } catch (e) {
        this.$message.error(e.message || '操作失败')
      } finally {
        this.completing = false
      }
    },
    async oneClickUnfixed () {
      if (!this.jobId) return
      this.completing = true
      try {
        await completeVerifyFixAllUnfixed(this.jobId)
        this.$message.success('已全部标记为核验未修复(7)')
        await this.refreshJob()
      } catch (e) {
        this.$message.error(e.message || '操作失败')
      } finally {
        this.completing = false
      }
    },
    goManualIngest () {
      this.$router.push({ name: 'MockManualIngest', query: { taskId: this.taskIdInput } })
    },
    goMockE2e () {
      this.$router.push({ name: 'MockE2eConsole' })
    },
    goWebhookLog () {
      this.$router.push({
        name: 'WebhookDeliveryList',
        query: {
          partnerId: this.resolvePartnerId(),
          eventType: 'INSTANCE_VERIFY_FIX_COMPLETED'
        }
      })
    },
    goVerifyFixOps () {
      this.$router.push({
        name: 'VerifyFixOps',
        query: { partnerId: this.resolvePartnerId() }
      })
    }
  }
}
</script>

<style scoped>
.soc-orch-page code { background: #f5f5f5; padding: 2px 6px; }
.soc-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
}
.soc-hint.warn { color: #d48806; }
.stat-hint { margin-left: 8px; color: rgba(0, 0, 0, 0.45); font-size: 12px; }
.soc-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.soc-file-input { display: none; }
.soc-file-name { font-size: 13px; color: rgba(0, 0, 0, 0.65); }
.soc-next-steps {
  margin: 0 0 16px 18px;
  padding: 0;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.8;
}
.soc-quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

<template>
  <div v-if="payload && (payload.verifyFixWorkspace || payload.job)">
    <template v-if="summaryJob">
      <a-descriptions bordered size="small" :column="2" style="margin-bottom: 12px;">
        <a-descriptions-item label="jobId"><code>{{ summaryJob.jobId }}</code></a-descriptions-item>
        <a-descriptions-item label="状态">{{ summaryJob.status }}</a-descriptions-item>
        <a-descriptions-item label="条数">{{ summaryJob.itemCount != null ? summaryJob.itemCount : '-' }}</a-descriptions-item>
        <a-descriptions-item label="进度">{{ summaryJob.progress != null ? summaryJob.progress + '%' : '-' }}</a-descriptions-item>
        <a-descriptions-item label="复扫 sub" :span="2">
          {{ rescanSubCount }} 个
          <span v-if="summaryJob.caseId" class="muted"> · case <code>{{ summaryJob.caseId }}</code></span>
        </a-descriptions-item>
      </a-descriptions>
      <a-button type="primary" size="small" @click="goWorkspace">进入修复核验工作台</a-button>
      <p class="hint">完整子任务、报告路径、外发与逐项结果请在工作台查看。</p>
    </template>
  </div>
  <a-empty v-else description="无修复核验载荷" />
</template>

<script>
export default {
  name: 'VerifyFixCasePanel',
  props: {
    payload: { type: Object, default: null }
  },
  computed: {
    summaryJob () {
      if (!this.payload) return null
      if (this.payload.verifyFixWorkspace && this.payload.verifyFixWorkspace.job) {
        return this.payload.verifyFixWorkspace.job
      }
      return this.payload.job
    },
    rescanSubCount () {
      if (this.payload && this.payload.verifyFixWorkspace && this.payload.verifyFixWorkspace.rescanSubs) {
        return this.payload.verifyFixWorkspace.rescanSubs.length
      }
      return (this.payload && this.payload.rescanSubs) ? this.payload.rescanSubs.length : 0
    },
    jobId () {
      return this.summaryJob && this.summaryJob.jobId
    }
  },
  methods: {
    goWorkspace () {
      if (!this.jobId) return
      this.$router.push({ name: 'VerifyFixWorkspace', params: { jobId: this.jobId } })
    }
  }
}
</script>

<style scoped>
.hint { margin-top: 12px; color: rgba(0,0,0,.45); font-size: 13px; }
.muted { color: rgba(0,0,0,.45); }
</style>

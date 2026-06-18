<template>
  <div v-if="payload && payload.job">
    <a-descriptions bordered size="small" :column="2" style="margin-bottom: 16px;">
      <a-descriptions-item label="jobId"><code>{{ payload.job.jobId }}</code></a-descriptions-item>
      <a-descriptions-item label="状态">{{ payload.job.status }}</a-descriptions-item>
      <a-descriptions-item label="centerSubId">{{ payload.centerSubId || '-' }}</a-descriptions-item>
      <a-descriptions-item label="centerPlanId">{{ payload.centerPlanId || '-' }}</a-descriptions-item>
      <a-descriptions-item label="surveyId">{{ payload.surveyId || '-' }}</a-descriptions-item>
      <a-descriptions-item label="进度">{{ payload.progress != null ? payload.progress + '%' : '-' }}</a-descriptions-item>
      <a-descriptions-item label="复扫目标" :span="2">{{ payload.inputIps || '-' }}</a-descriptions-item>
    </a-descriptions>
    <a-table
      size="small"
      row-key="vulInfoId"
      :columns="columns"
      :data-source="payload.job.items || []"
      :pagination="false"
    />
  </div>
  <a-empty v-else description="无修复核验载荷" />
</template>

<script>
const columns = [
  { title: 'vulInfoId', dataIndex: 'vulInfoId' },
  { title: '前状态', dataIndex: 'previousStat', width: 80 },
  { title: '结果', dataIndex: 'resultStat', width: 80 },
  { title: '项状态', dataIndex: 'itemStatus', width: 90 }
]

export default {
  name: 'VerifyFixCasePanel',
  props: {
    payload: { type: Object, default: null }
  },
  data () {
    return { columns }
  }
}
</script>

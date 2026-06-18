<template>
  <div v-if="payload">
    <a-descriptions bordered size="small" :column="1">
      <a-descriptions-item label="vulInfoId"><code>{{ payload.vulInfoId || '-' }}</code></a-descriptions-item>
      <a-descriptions-item label="当前状态">{{ payload.vulInfoStat != null ? payload.vulInfoStat : '-' }}</a-descriptions-item>
      <a-descriptions-item label="taskId">{{ payload.taskId || '-' }}</a-descriptions-item>
      <a-descriptions-item label="漏洞名称">{{ payload.vulName || '-' }}</a-descriptions-item>
      <a-descriptions-item label="地址">{{ payload.vulNetAddr || '-' }}</a-descriptions-item>
      <a-descriptions-item label="operationId">{{ payload.operationId || '-' }}</a-descriptions-item>
    </a-descriptions>
    <div v-if="payload.requestSummaryJson" class="json-block">
      <div class="label">请求摘要</div>
      <pre>{{ payload.requestSummaryJson }}</pre>
    </div>
    <div v-if="payload.resultSummaryJson" class="json-block">
      <div class="label">响应摘要</div>
      <pre>{{ payload.resultSummaryJson }}</pre>
    </div>
  </div>
  <a-empty v-else description="无实例操作载荷" />
</template>

<script>
export default {
  name: 'InstanceOpCasePanel',
  props: {
    payload: { type: Object, default: null }
  }
}
</script>

<style scoped>
.json-block { margin-top: 16px; }
.label { font-size: 12px; color: rgba(0,0,0,.45); margin-bottom: 4px; }
pre {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  padding: 8px;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
}
</style>

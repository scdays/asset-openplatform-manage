<template>
  <div v-if="payload">
    <a-descriptions bordered size="small" :column="2">
      <a-descriptions-item label="batchId">{{ payload.batchId || '-' }}</a-descriptions-item>
      <a-descriptions-item label="成功/失败">{{ payload.successCount || 0 }} / {{ payload.failedCount || 0 }}</a-descriptions-item>
    </a-descriptions>

    <a-table
      v-if="(payload.targets || []).length"
      style="margin-top: 12px;"
      size="small"
      row-key="targetKey"
      :columns="columns"
      :data-source="payload.targets"
      :pagination="{ pageSize: 10 }"
    />

    <div v-else-if="(payload.successVulInfoIds || []).length" style="margin-top: 12px;">
      <div class="label">成功 vulInfoID</div>
      <div>
        <a-tag v-for="id in payload.successVulInfoIds" :key="'s-' + id" style="margin: 4px;">{{ id }}</a-tag>
      </div>
    </div>
    <div v-if="(payload.failedVulInfoIds || []).length" style="margin-top: 12px;">
      <div class="label">失败 vulInfoID</div>
      <div>
        <a-tag v-for="id in payload.failedVulInfoIds" :key="'f-' + id" color="red" style="margin: 4px;">{{ id }}</a-tag>
      </div>
    </div>

    <div v-if="payload.resultSummaryJson" class="json-block">
      <div class="label">响应摘要</div>
      <pre>{{ payload.resultSummaryJson }}</pre>
    </div>
  </div>
  <a-empty v-else description="无批量操作载荷" />
</template>

<script>
const columns = [
  { title: 'vulInfoID', dataIndex: 'targetKey', width: 140 },
  { title: '状态', dataIndex: 'targetStatus', width: 90 },
  { title: '前状态', dataIndex: 'prevStat', width: 70 },
  { title: '后状态', dataIndex: 'resultStat', width: 70 }
]

export default {
  name: 'BatchCasePanel',
  props: {
    payload: { type: Object, default: null }
  },
  data () {
    return { columns }
  }
}
</script>

<style scoped>
.label { font-size: 12px; color: rgba(0,0,0,.45); margin-bottom: 4px; }
.json-block { margin-top: 16px; }
pre {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  padding: 8px;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
}
</style>

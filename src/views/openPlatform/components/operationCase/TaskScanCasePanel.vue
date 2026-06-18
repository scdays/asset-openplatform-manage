<template>
  <div v-if="payload && payload.taskWorkspace && payload.taskWorkspace.task" class="task-scan-panel">
    <a-descriptions bordered size="small" :column="2">
      <a-descriptions-item label="taskId">
        <code>{{ payload.taskId || payload.taskWorkspace.task.taskId }}</code>
      </a-descriptions-item>
      <a-descriptions-item label="状态">
        <enum-tag type="openTaskStatus" :value="payload.taskWorkspace.task.status" />
      </a-descriptions-item>
      <a-descriptions-item label="任务名称" :span="2">
        {{ payload.taskWorkspace.task.taskName }}
      </a-descriptions-item>
      <a-descriptions-item label="scanTemplateId">
        {{ payload.taskWorkspace.task.scanTemplateId }}
      </a-descriptions-item>
      <a-descriptions-item label="实例数">
        {{ payload.taskWorkspace.task.instanceCount || 0 }}
      </a-descriptions-item>
      <a-descriptions-item label="autoVerify">
        {{ payload.taskWorkspace.task.autoVerify ? '是' : '否' }}
      </a-descriptions-item>
      <a-descriptions-item label="交叉扫描">
        {{ payload.taskWorkspace.task.crossScan ? '是' : '否' }}
      </a-descriptions-item>
    </a-descriptions>
    <p class="hint">完整排查/验证子任务、VTC 结果请进入 OPEN 编排工作台。</p>
  </div>
  <a-alert
    v-else-if="payload && payload.taskId"
    type="info"
    show-icon
    :message="`已绑定任务 ${payload.taskId}，工作台数据加载中或任务尚未就绪`"
  />
  <a-empty v-else description="无 TASK_SCAN 载荷" />
</template>

<script>
import EnumTag from '@/components/openPlatform/EnumTag'

export default {
  name: 'TaskScanCasePanel',
  components: { EnumTag },
  props: {
    payload: { type: Object, default: null }
  }
}
</script>

<style scoped>
.hint { margin-top: 12px; color: rgba(0,0,0,.45); font-size: 13px; }
</style>

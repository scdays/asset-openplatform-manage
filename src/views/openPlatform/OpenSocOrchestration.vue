<template>
  <div class="p_16 soc-orch-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>SOC 编排监控</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      message="生产编排模式"
      description="需 open-api 配置 orchestration.enabled=true 且 adapter-mode=vul-pass；本页通过 Partner API 建任务并轮询进度。"
      style="margin: 16px 0;"
    />

    <a-card title="Partner 会话" :bordered="false" style="margin-bottom: 16px;">
      <a-row :gutter="12">
        <a-col :span="8">
          <a-input v-model="partnerId" placeholder="partnerId" />
        </a-col>
        <a-col :span="12">
          <a-input v-model="accessToken" placeholder="Bearer Token（可先走 Mock 全流程联调获取）" />
        </a-col>
        <a-col :span="4">
          <a-button type="primary" block @click="bindSession">绑定会话</a-button>
        </a-col>
      </a-row>
    </a-card>

    <a-card title="创建 SOC 双扫任务" :bordered="false" style="margin-bottom: 16px;">
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="extTaskId">
              <a-input v-model="form.extTaskId" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="taskName">
              <a-input v-model="form.taskName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="targets.hosts">
          <a-input v-model="form.hosts" placeholder="192.168.1.1,192.168.1.2" />
        </a-form-item>
        <a-button type="primary" :loading="creating" @click="createTask">创建并轮询</a-button>
      </a-form>
    </a-card>

    <a-card v-if="taskId" title="任务进度" :bordered="false">
      <p>platformTaskId：<code>{{ taskId }}</code></p>
      <p>status：<a-tag>{{ taskStatus }}</a-tag> · progress：{{ taskProgress }}%</p>
      <a-button size="small" :loading="polling" @click="refreshTask">刷新</a-button>
    </a-card>
  </div>
</template>

<script>
import { bindPartnerAuth, createVulTask, getTask } from '@/api/openPlatform/openPartnerApi'
import { getPartnerSession } from '@/utils/openPartnerRequest'

export default {
  name: 'OpenSocOrchestration',
  data () {
    const ts = Date.now()
    return {
      partnerId: '',
      accessToken: '',
      creating: false,
      polling: false,
      taskId: '',
      taskStatus: '',
      taskProgress: 0,
      pollTimer: null,
      form: {
        extTaskId: `soc-${ts}`,
        taskName: `SOC双扫-${ts}`,
        hosts: '192.168.1.100'
      }
    }
  },
  mounted () {
    const s = getPartnerSession()
    if (s.partnerId) this.partnerId = s.partnerId
    if (s.accessToken) this.accessToken = s.accessToken
  },
  beforeDestroy () {
    this.stopPoll()
  },
  methods: {
    bindSession () {
      if (!this.partnerId || !this.accessToken) {
        this.$message.warning('请填写 partnerId 与 Token')
        return
      }
      bindPartnerAuth(this.accessToken, this.partnerId)
      this.$message.success('会话已绑定')
    },
    async createTask () {
      this.bindSession()
      this.creating = true
      try {
        const res = await createVulTask({
          extTaskId: this.form.extTaskId,
          taskName: this.form.taskName,
          vulnType: 1,
          scanTemplateId: 1001,
          reportTemplateId: 2001,
          targets: { hosts: this.form.hosts }
        })
        const data = res && res.data ? res.data : res
        this.taskId = data.taskId
        this.taskStatus = data.status || 'ACCEPTED'
        this.taskProgress = data.progress || 0
        this.$message.success('任务已创建')
        this.startPoll()
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || '创建失败')
      } finally {
        this.creating = false
      }
    },
    async refreshTask () {
      if (!this.taskId) return
      this.polling = true
      try {
        const res = await getTask(this.taskId)
        const data = res && res.data ? res.data : res
        this.taskStatus = data.status
        this.taskProgress = data.progress != null ? data.progress : 0
        if (data.status === 'FINISHED' || data.status === 'FAILED') {
          this.stopPoll()
        }
      } catch (e) {
        this.$message.error('查询失败')
      } finally {
        this.polling = false
      }
    },
    startPoll () {
      this.stopPoll()
      this.pollTimer = setInterval(() => this.refreshTask(), 5000)
    },
    stopPoll () {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    }
  }
}
</script>

<style scoped>
.soc-orch-page code { background: #f5f5f5; padding: 2px 6px; }
</style>

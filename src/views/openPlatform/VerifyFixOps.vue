<template>
  <div class="p_16 verify-fix-ops-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>修复核验运营</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      message="异步 verify-fix（§5.5）"
      description="编排模式下无需传 verifyResult；受理返回 verifyFixJobId，实例状态保持 5，Kafka 回收后由 vul-pass 判定 6/7/10。"
      style="margin: 16px 0;"
    />

    <a-card title="发起修复核验" :bordered="false" style="margin-bottom: 16px;">
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="vulInfoID">
              <a-input v-model="vulInfoId" placeholder="实例 ID" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="备注（可选）">
              <a-input v-model="remark" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label=" ">
              <a-button type="primary" :loading="submitting" @click="submit">提交 verify-fix</a-button>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card title="受理记录（本页会话）" :bordered="false">
      <a-table
        :columns="columns"
        :data-source="records"
        row-key="verifyFixJobId"
        size="small"
        :pagination="false"
      />
    </a-card>
  </div>
</template>

<script>
import { verifyFixInstance } from '@/api/openPlatform/openPartnerApi'
import { bindPartnerAuth } from '@/api/openPlatform/openPartnerApi'
import { getPartnerSession } from '@/utils/openPartnerRequest'

const columns = [
  { title: 'vulInfoID', dataIndex: 'vulInfoID', key: 'vulInfoID' },
  { title: 'verifyFixJobId', dataIndex: 'verifyFixJobId', key: 'verifyFixJobId' },
  { title: 'verifyFixStatus', dataIndex: 'verifyFixStatus', key: 'verifyFixStatus' },
  { title: 'vulInfoStat', dataIndex: 'vulInfoStat', key: 'vulInfoStat' },
  { title: '时间', dataIndex: 'time', key: 'time' }
]

export default {
  name: 'VerifyFixOps',
  data () {
    return {
      columns,
      vulInfoId: '',
      remark: '',
      submitting: false,
      records: []
    }
  },
  methods: {
    ensureSession () {
      const s = getPartnerSession()
      if (!s.accessToken || !s.partnerId) {
        this.$message.warning('请先在「Mock 全流程联调」或 SOC 编排页绑定 Partner Token')
        return false
      }
      bindPartnerAuth(s.accessToken, s.partnerId)
      return true
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
        this.records.unshift({
          vulInfoID: data.vulInfoID || this.vulInfoId,
          verifyFixJobId: data.verifyFixJobId || '-',
          verifyFixStatus: data.verifyFixStatus || '-',
          vulInfoStat: data.vulInfoStat,
          time: new Date().toLocaleString()
        })
        this.$message.success(data.verifyFixJobId ? `已受理 ${data.verifyFixJobId}` : '已提交')
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.message) || e.message
        this.$message.error(msg || '提交失败')
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

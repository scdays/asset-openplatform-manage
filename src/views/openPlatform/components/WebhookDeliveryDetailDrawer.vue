<template>
  <a-drawer
    :visible="visible"
    :width="920"
    :title="drawerTitle"
    @close="handleClose"
  >
    <a-spin :spinning="loading">
      <div v-if="detail">
        <a-tabs v-model="activeTab">
          <a-tab-pane key="summary" tab="概要">
            <div class="kv-row"><span class="k">deliveryId</span><span class="v"><code>{{ detail.id }}</code></span></div>
            <div class="kv-row"><span class="k">eventId</span><span class="v"><code>{{ detail.eventId || '-' }}</code></span></div>
            <div class="kv-row"><span class="k">partnerId</span><span class="v">{{ detail.partnerId }}</span></div>
            <div class="kv-row"><span class="k">事件类型</span><span class="v"><enum-tag type="webhookEventType" :value="detail.eventType" /></span></div>
            <div class="kv-row"><span class="k">关联资源</span><span class="v">
              <template v-if="detail.resourceId">
                <enum-tag v-if="detail.resourceType" type="domain" :value="detail.resourceType" />
                <code>{{ detail.resourceId }}</code>
                <a class="link-btn" @click="goInvocations">调用记录</a>
              </template>
              <span v-else>-</span>
            </span></div>
            <template v-if="detail.eventType === 'EXPORT_READY' || detail.eventType === 'ARTIFACT_READY'">
              <div v-if="detail.eventType === 'ARTIFACT_READY'" class="kv-row"><span class="k">artifactId</span><span class="v"><code>{{ detail.artifactId || '-' }}</code></span></div>
              <div v-if="detail.eventType === 'ARTIFACT_READY'" class="kv-row"><span class="k">产物格式</span><span class="v">{{ detail.artifactFormat || '-' }}</span></div>
              <div v-if="detail.exportId" class="kv-row"><span class="k">exportId</span><span class="v"><code>{{ detail.exportId }}</code></span></div>
              <div v-if="detail.exportFormat" class="kv-row"><span class="k">外发格式</span><span class="v">{{ detail.exportFormat }}</span></div>
              <div class="kv-row"><span class="k">外发阶段</span><span class="v">{{ detail.exportStage || '-' }}</span></div>
              <div class="kv-row"><span class="k">Partner downloadUrl</span><span class="v"><code>{{ detail.partnerDownloadUrl || '-' }}</code></span></div>
            </template>
            <div class="kv-row"><span class="k">callbackUrl</span><span class="v">{{ detail.callbackUrl }}</span></div>
            <div class="kv-row"><span class="k">HTTP</span><span class="v"><a-tag :color="httpStatusColor(detail.httpStatus)">{{ formatHttpStatus(detail.httpStatus) }}</a-tag></span></div>
            <div class="kv-row"><span class="k">状态</span><span class="v"><enum-tag type="webhookDeliveryStatus" :value="detail.status" /></span></div>
            <div class="kv-row"><span class="k">投递次数</span><span class="v">{{ formatAttemptCount(detail) }}</span></div>
            <div class="kv-row"><span class="k">投递时间</span><span class="v">{{ formatDateTime(detail.createdAt) }}</span></div>
          </a-tab-pane>
          <a-tab-pane key="payload" tab="投递报文">
            <div class="payload-toolbar">
              <span class="helper">POST JSON 含 eventId / eventType / payload</span>
              <a-button size="small" @click="copyText(detail.payloadJsonFormatted || detail.payloadJson, '事件 JSON')">复制事件 JSON</a-button>
            </div>
            <pre class="code-block">{{ detail.payloadJsonFormatted || detail.payloadJson || '-' }}</pre>
          </a-tab-pane>
          <a-tab-pane key="retries" tab="重试历史">
            <p class="helper">按 eventId 聚合同一次 Webhook 的首次投递 / 自动重试 / 手动重试</p>
            <a-table
              size="small"
              row-key="id"
              :pagination="false"
              :columns="historyColumns"
              :data-source="detail.retryHistory || []"
            >
              <span slot="trigger" slot-scope="text, record">{{ record.triggerSourceLabel || text || '-' }}</span>
              <span slot="status" slot-scope="text"><enum-tag type="webhookDeliveryStatus" :value="text" /></span>
              <span slot="httpStatus" slot-scope="text">{{ formatHttpStatus(text) }}</span>
            </a-table>
          </a-tab-pane>
          <a-tab-pane key="invocations" tab="关联调用">
            <p class="helper">按 partnerId + resourceId 查询流量治理中同源 API 调用（近 10 条）</p>
            <a-table
              size="small"
              row-key="invocationId"
              :pagination="false"
              :columns="invocationColumns"
              :data-source="detail.relatedInvocations || []"
            >
              <span slot="operationId" slot-scope="text">
                <enum-tag v-if="text" type="apiOperation" :value="text" with-code />
                <span v-else>-</span>
              </span>
              <span slot="responseCode" slot-scope="text"><response-code-tag :value="text" /></span>
              <span slot="action" slot-scope="text, record">
                <a @click="goInvocationDetail(record)">详情</a>
              </span>
            </a-table>
            <a-empty v-if="!(detail.relatedInvocations && detail.relatedInvocations.length)" description="暂无关联调用" />
          </a-tab-pane>
        </a-tabs>
      </div>
      <a-empty v-else-if="!loading" description="暂无数据" />
    </a-spin>

    <div class="drawer-footer">
      <a-button
        v-if="canRetry"
        type="primary"
        :loading="retrying"
        @click="handleRetry"
      >
        手动重试
      </a-button>
      <a-button @click="handleClose">关闭</a-button>
    </div>
  </a-drawer>
</template>

<script>
import { getWebhookDeliveryDetail, retryWebhookDelivery } from '@/api/openPlatform/invocation'
import EnumTag from '@/components/openPlatform/EnumTag'
import ResponseCodeTag from '@/components/openPlatform/ResponseCodeTag'
import { resolveInvocationLinkQuery } from '@/utils/openPlatformLink'
import { formatHttpStatus, httpStatusColor, labelOf } from '@/constants/openPlatformDisplay'

const historyColumns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '次数', dataIndex: 'retryCount', width: 70 },
  { title: '来源', dataIndex: 'triggerSourceLabel', scopedSlots: { customRender: 'trigger' }, width: 100 },
  { title: 'HTTP', dataIndex: 'httpStatus', scopedSlots: { customRender: 'httpStatus' }, width: 120 },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 100 },
  { title: '时间', dataIndex: 'createdAt' }
]

const invocationColumns = [
  { title: 'API 操作', dataIndex: 'operationId', scopedSlots: { customRender: 'operationId' }, width: 200 },
  { title: 'resourceId', dataIndex: 'resourceId', width: 160 },
  { title: '响应码', dataIndex: 'responseCode', scopedSlots: { customRender: 'responseCode' }, width: 140 },
  { title: '开始时间', dataIndex: 'startedAt', width: 170 },
  { title: '操作', scopedSlots: { customRender: 'action' }, width: 80 }
]

export default {
  name: 'WebhookDeliveryDetailDrawer',
  components: { EnumTag, ResponseCodeTag },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    deliveryId: {
      type: [Number, String],
      default: null
    }
  },
  data () {
    return {
      loading: false,
      retrying: false,
      detail: null,
      activeTab: 'summary',
      historyColumns,
      invocationColumns
    }
  },
  computed: {
    drawerTitle () {
      if (this.detail && this.detail.eventType) {
        return `Webhook 投递详情 · ${labelOf('webhookEventType', this.detail.eventType)}`
      }
      return 'Webhook 投递详情'
    },
    canRetry () {
      return this.detail && this.detail.status === 'FAILED'
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.activeTab = 'summary'
        this.loadDetail()
      } else {
        this.detail = null
      }
    },
    deliveryId () {
      if (this.visible) {
        this.loadDetail()
      }
    }
  },
  methods: {
    loadDetail () {
      if (this.deliveryId == null || this.deliveryId === '') {
        this.detail = null
        return
      }
      this.loading = true
      getWebhookDeliveryDetail(this.deliveryId).then(data => {
        this.detail = data || null
      }).catch(err => {
        this.detail = null
        this.$message.error((err && err.message) || '加载 Webhook 投递详情失败')
      }).finally(() => {
        this.loading = false
      })
    },
    handleRetry () {
      if (!this.deliveryId) return
      this.retrying = true
      retryWebhookDelivery(this.deliveryId).then(data => {
        const http = data && data.httpStatus
        const ok = data && data.status === 'SUCCESS'
        this.$message.success(ok ? `重试成功 · HTTP ${http}` : `重试完成 · ${labelOf('webhookDeliveryStatus', data && data.status)} · HTTP ${http == null ? '-' : http}`)
        this.$emit('retried')
        this.loadDetail()
      }).catch(err => {
        this.$message.error((err && err.message) || '重试失败')
      }).finally(() => {
        this.retrying = false
      })
    },
    goInvocations () {
      const link = resolveInvocationLinkQuery(this.detail)
      if (!link) return
      this.$emit('close')
      this.$router.push({
        name: 'InvocationList',
        query: link
      })
    },
    goInvocationDetail (record) {
      if (!record || !record.invocationId) return
      this.$emit('close')
      this.$router.push({ name: 'InvocationDetail', params: { invocationId: record.invocationId } })
    },
    handleClose () {
      this.$emit('close')
    },
    formatHttpStatus,
    httpStatusColor,
    formatAttemptCount (detail) {
      const count = detail && detail.attemptCount
      if (count == null || count <= 1) {
        return '1 次（首次）'
      }
      return `${count} 次（含自动/手动重试）`
    },
    formatDateTime (value) {
      if (!value) return '-'
      return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value
    },
    copyText (text, label) {
      if (!text) {
        this.$message.warning('暂无内容可复制')
        return
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success(`${label} 已复制`)
        }).catch(() => this.fallbackCopy(text, label))
      } else {
        this.fallbackCopy(text, label)
      }
    },
    fallbackCopy (text, label) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        this.$message.success(`${label} 已复制`)
      } catch (e) {
        this.$message.error('复制失败')
      }
      document.body.removeChild(ta)
    }
  }
}
</script>

<style scoped>
.kv-row {
  display: flex;
  margin-bottom: 10px;
  font-size: 13px;
}

.kv-row .k {
  width: 120px;
  color: rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}

.kv-row .v {
  flex: 1;
  word-break: break-all;
}

.link-btn {
  margin-left: 8px;
}

.helper {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.payload-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
  flex-wrap: wrap;
}

.code-block {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  padding: 12px;
  border-radius: 2px;
  font-size: 12px;
  overflow: auto;
  max-height: 420px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.drawer-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 100%;
  border-top: 1px solid #e8e8e8;
  padding: 10px 16px;
  background: #fff;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.ant-drawer-body) {
  padding-bottom: 64px;
}
</style>

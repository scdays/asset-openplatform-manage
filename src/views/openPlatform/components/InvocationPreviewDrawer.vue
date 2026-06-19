<template>
  <a-drawer :visible="visible" :width="920" :title="drawerTitle" @close="handleClose">
    <template slot="extra"><span class="drawer-hint">快速预览调用摘要，完整报文请打开详情页</span></template>
    <a-spin :spinning="loading">
      <div v-if="detail">
        <a-tabs v-model="activeTab">
          <a-tab-pane key="summary" tab="概要">
            <div class="kv-row"><span class="k">requestId</span><span class="v"><code>{{ detail.requestId }}</code></span></div>
            <div class="kv-row"><span class="k">partnerId</span><span class="v">{{ detail.partnerId }}</span></div>
            <div class="kv-row"><span class="k">API 操作</span><span class="v"><enum-tag v-if="detail.operationId" type="apiOperation" :value="detail.operationId" with-code /><span v-else>-</span></span></div>
            <div class="kv-row"><span class="k">业务域</span><span class="v"><enum-tag type="domain" :value="detail.domain" /></span></div>
            <div class="kv-row"><span class="k">HTTP</span><span class="v">{{ detail.httpMethod }} {{ detail.requestPath }}</span></div>
            <div class="kv-row"><span class="k">响应码</span><span class="v"><response-code-tag :value="detail.responseCode" /></span></div>
            <div class="kv-row"><span class="k">耗时</span><span class="v">{{ formatDuration(detail.latencyMs) }}</span></div>
            <div class="kv-row"><span class="k">resourceId</span><span class="v"><code>{{ detail.resourceId || '-' }}</code></span></div>
            <div class="kv-row"><span class="k">开始时间</span><span class="v">{{ formatDateTime(detail.startedAt) }}</span></div>
          </a-tab-pane>
          <a-tab-pane key="payload" tab="报文/响应">
            <p class="helper">Request Body 与 Response Body 均按需二次加载。</p>
            <div class="payload-grid">
              <div class="payload-box">
                <div class="payload-label">Request Body</div>
                <div v-if="detail.hasRequestBody" class="response-body-actions">
                  <p class="helper"><span v-if="detail.requestBodyByteSize">已持久化约 {{ formatBytes(detail.requestBodyByteSize) }}。</span> 点击后加载完整报文。</p>
                  <div class="action-row">
                    <a-button size="small" type="primary" @click="openRequestBody">弹窗查看</a-button>
                    <a-button size="small" @click="downloadRequestBody">下载 TXT</a-button>
                  </div>
                </div>
                <p v-else class="helper">暂无请求报文</p>
              </div>
              <div class="payload-box">
                <div class="payload-label">Response Body</div>
                <div v-if="detail.hasResponseBody" class="response-body-actions">
                  <p class="helper"><span v-if="detail.responseBodyByteSize">已持久化约 {{ formatBytes(detail.responseBodyByteSize) }}。</span> 点击后加载完整报文。</p>
                  <div class="action-row">
                    <a-button size="small" type="primary" @click="openResponseBody">弹窗查看</a-button>
                    <a-button size="small" @click="downloadResponseBody">下载 TXT</a-button>
                  </div>
                </div>
                <p v-else class="helper">暂无响应报文</p>
              </div>
            </div>
          </a-tab-pane>
          <a-tab-pane key="resource" tab="关联资源">
            <div class="kv-row"><span class="k">resourceType</span><span class="v">{{ detail.resourceType || '-' }}</span></div>
            <div class="kv-row"><span class="k">resourceId</span><span class="v"><code>{{ detail.resourceId || '-' }}</code></span></div>
            <div class="kv-row"><span class="k">clientIp</span><span class="v">{{ detail.clientIp || '-' }}</span></div>
            <div v-if="detail.relatedWebhooks && detail.relatedWebhooks.length" class="related-webhooks">
              <div class="payload-label">关联 Webhook</div>
              <a-table size="small" row-key="id" :pagination="false" :columns="webhookColumns" :data-source="detail.relatedWebhooks">
                <span slot="eventType" slot-scope="text"><enum-tag type="webhookEventType" :value="text" /></span>
                <span slot="status" slot-scope="text"><enum-tag type="webhookDeliveryStatus" :value="text" /></span>
              </a-table>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
      <a-empty v-else-if="!loading" description="暂无调用详情" />
    </a-spin>
    <div class="drawer-footer">
      <a-button type="primary" :disabled="!invocationId" @click="openFullPage">打开完整详情</a-button>
      <a-button @click="handleClose">关闭</a-button>
    </div>
    <invocation-request-body-modal :visible="requestBodyVisible" :invocation-id="invocationId" @close="requestBodyVisible = false" />
    <invocation-response-body-modal :visible="responseBodyVisible" :invocation-id="invocationId" @close="responseBodyVisible = false" />
  </a-drawer>
</template>

<script>
import { getInvocationDetail, getInvocationRequestBody, getInvocationResponseBody } from '@/api/openPlatform/invocation'
import { labelWithCode } from '@/constants/openPlatformDisplay'
import EnumTag from '@/components/openPlatform/EnumTag'
import ResponseCodeTag from '@/components/openPlatform/ResponseCodeTag'
import InvocationRequestBodyModal from './InvocationRequestBodyModal'
import InvocationResponseBodyModal from './InvocationResponseBodyModal'

const webhookColumns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '事件类型', dataIndex: 'eventType', scopedSlots: { customRender: 'eventType' } },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 100 },
  { title: 'HTTP', dataIndex: 'httpStatus', width: 80 }
]

export default {
  name: 'InvocationPreviewDrawer',
  components: { EnumTag, ResponseCodeTag, InvocationRequestBodyModal, InvocationResponseBodyModal },
  props: { visible: { type: Boolean, default: false }, invocationId: { type: String, default: '' } },
  data () { return { loading: false, detail: null, activeTab: 'summary', webhookColumns, requestBodyVisible: false, responseBodyVisible: false } },
  computed: {
    drawerTitle () {
      if (this.detail && this.detail.operationId) {
        return '调用预览 - ' + labelWithCode('apiOperation', this.detail.operationId)
      }
      return '调用预览 - 加载中...'
    }
  },
  watch: {
    visible (val) {
      if (val) { this.activeTab = 'summary'; this.loadDetail() } else { this.detail = null; this.requestBodyVisible = false; this.responseBodyVisible = false }
    },
    invocationId () { if (this.visible) this.loadDetail() }
  },
  methods: {
    loadDetail () {
      if (!this.invocationId) { this.detail = null; return }
      this.loading = true
      getInvocationDetail(this.invocationId).then(data => { this.detail = data || null }).catch(err => {
        this.detail = null; this.$message.error((err && err.message) || '加载调用详情失败')
      }).finally(() => { this.loading = false })
    },
    openRequestBody () { this.requestBodyVisible = true },
    downloadRequestBody () {
      if (!this.invocationId) return
      getInvocationRequestBody(this.invocationId).then(data => {
        const text = data && data.bodyFormatted
        if (!text) { this.$message.warning('暂无可下载内容'); return }
        const filename = this.invocationId + '-request.txt'
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = filename
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url)
        this.$message.success('已开始下载')
      }).catch(err => { this.$message.error((err && err.message) || '下载请求报文失败') })
    },
    openResponseBody () { this.responseBodyVisible = true },
    downloadResponseBody () {
      if (!this.invocationId) return
      getInvocationResponseBody(this.invocationId).then(data => {
        const text = data && data.bodyFormatted
        if (!text) { this.$message.warning('暂无可下载内容'); return }
        const filename = this.invocationId + '-response.txt'
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = filename
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url)
        this.$message.success('已开始下载')
      }).catch(err => { this.$message.error((err && err.message) || '下载响应报文失败') })
    },
    openFullPage () { if (!this.invocationId) return; this.$emit('close'); this.$router.push({ name: 'InvocationDetail', params: { invocationId: this.invocationId } }) },
    handleClose () { this.$emit('close') },
    formatDuration (latencyMs) { if (latencyMs === undefined || latencyMs === null || latencyMs === '') return '-'; return latencyMs + ' ms' },
    formatDateTime (value) { if (!value) return '-'; return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value },
    formatBytes (size) {
      if (size === undefined || size === null || size === '') return '-'
      const num = Number(size)
      if (Number.isNaN(num) || num <= 0) return '-'
      if (num < 1024) return num + ' B'
      if (num < 1024 * 1024) return (num / 1024).toFixed(1) + ' KB'
      return (num / 1024 / 1024).toFixed(2) + ' MB'
    }
  }
}
</script>

<style scoped>
.drawer-hint { color: rgba(0,0,0,.45); font-size: 12px; }
.kv-row { display: flex; margin-bottom: 10px; font-size: 13px; }
.kv-row .k { width: 120px; color: rgba(0,0,0,.45); flex-shrink: 0; }
.kv-row .v { flex: 1; word-break: break-all; }
.helper { color: rgba(0,0,0,.45); font-size: 12px; margin-bottom: 12px; }
.payload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 960px) { .payload-grid { grid-template-columns: 1fr; } }
.payload-label { font-size: 12px; color: rgba(0,0,0,.45); margin-bottom: 6px; font-weight: 500; }
.response-body-actions .action-row { display: flex; gap: 8px; }
.related-webhooks { margin-top: 16px; }
.drawer-footer { position: absolute; right: 0; bottom: 0; width: 100%; border-top: 1px solid #e8e8e8; padding: 10px 16px; background: #fff; text-align: right; display: flex; justify-content: flex-end; gap: 8px; }
:deep(.ant-drawer-body) { padding-bottom: 64px; }
</style>

<template>
  <div class="p_16 invocation-detail-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>调用治理</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'InvocationList' })">调用记录</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>调用详情</a-breadcrumb-item>
    </a-breadcrumb>

    <a-spin :spinning="loading">
      <div v-if="detail" class="detail-header">
        <div>
          <h2 class="detail-title">{{ detail.operationId }}</h2>
          <div class="detail-meta">
            <code>{{ detail.requestId }}</code>
            <span> · {{ detail.partnerId }}</span>
            <span> · {{ formatDateTime(detail.startedAt) }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <a-button @click="openPreview">打开预览 Drawer</a-button>
          <a-button v-if="detail.hasResponseBody" @click="openResponseBody">查看响应报文</a-button>
          <a-button v-if="detail.hasResponseBody" @click="downloadResponseBody">下载响应 TXT</a-button>
          <a-button @click="goBack">返回列表</a-button>
        </div>
      </div>

      <div v-if="detail" class="detail-grid">
        <div class="detail-sidebar">
          <a-card title="概要" :bordered="false" class="detail-card">
            <div class="kv-row"><span class="k">operationId</span><span class="v">{{ detail.operationId }}</span></div>
            <div class="kv-row"><span class="k">业务域</span><span class="v"><enum-tag type="domain" :value="detail.domain" /></span></div>
            <div class="kv-row"><span class="k">HTTP</span><span class="v">{{ detail.httpMethod }} {{ detail.requestPath }}</span></div>
            <div class="kv-row"><span class="k">响应码</span><span class="v"><response-code-tag :value="detail.responseCode" /></span></div>
            <div class="kv-row"><span class="k">message</span><span class="v">{{ detail.responseMessage || '-' }}</span></div>
            <div class="kv-row"><span class="k">耗时</span><span class="v">{{ formatDuration(detail.latencyMs) }}</span></div>
            <div class="kv-row"><span class="k">resourceType</span><span class="v">{{ detail.resourceType || '-' }}</span></div>
            <div class="kv-row"><span class="k">resourceId</span><span class="v"><code>{{ detail.resourceId || '-' }}</code></span></div>
            <div class="kv-row"><span class="k">clientIp</span><span class="v">{{ detail.clientIp || '-' }}</span></div>
          </a-card>

          <a-card title="关联资源" :bordered="false" class="detail-card">
            <div class="kv-row">
              <span class="k">Partner</span>
              <span class="v">
                <a @click="goPartner(detail.partnerId)">{{ detail.partnerId }}</a>
              </span>
            </div>
            <div v-if="detail.relatedWebhooks && detail.relatedWebhooks.length" class="kv-row">
              <span class="k">Webhook</span>
              <span class="v">
                <enum-tag type="webhookEventType" :value="detail.relatedWebhooks[0].eventType" />
                <a @click="goWebhookDetail(detail.relatedWebhooks[0])"> (#{{ detail.relatedWebhooks[0].id }})</a>
              </span>
            </div>
          </a-card>

          <a-card title="调用过程 Timeline" :bordered="false" class="detail-card">
            <div class="timeline">
              <div
                v-for="(item, index) in detail.timeline || []"
                :key="index"
                class="timeline-item"
                :class="{ fail: item.failed }"
              >
                <div class="t">{{ item.occurredAt }}</div>
                <div>{{ item.message }}</div>
              </div>
            </div>
          </a-card>
        </div>

        <div class="detail-main">
          <a-card title="请求头 / 响应头" :bordered="false" class="detail-card">
            <div class="payload-grid">
              <div class="payload-box">
                <div class="payload-label">
                  Request Headers
                  <a class="copy-link" @click="copyText(detail.requestHeadersPreview, '请求头')">复制</a>
                </div>
                <pre class="code-block">{{ detail.requestHeadersPreview }}</pre>
              </div>
              <div class="payload-box">
                <div class="payload-label">
                  Response Headers
                  <a class="copy-link" @click="copyText(detail.responseHeadersPreview, '响应头')">复制</a>
                </div>
                <pre class="code-block">{{ detail.responseHeadersPreview }}</pre>
              </div>
            </div>
          </a-card>

          <a-card title="请求体 / 响应体" :bordered="false" class="detail-card">
            <div class="payload-grid">
              <div class="payload-box">
                <div class="payload-label">
                  Request Body
                  <a class="copy-link" @click="copyText(detail.requestBodyPreview, '请求体')">复制</a>
                </div>
                <pre class="code-block">{{ detail.requestBodyPreview }}</pre>
              </div>
              <div class="payload-box">
                <div class="payload-label">Response Body</div>
                <div v-if="detail.hasResponseBody" class="response-body-actions">
                  <p class="helper">
                    响应报文较大，默认不加载。
                    <span v-if="detail.responseBodyByteSize">已持久化约 {{ formatBytes(detail.responseBodyByteSize) }}。</span>
                  </p>
                  <div class="action-row">
                    <a-button size="small" type="primary" @click="openResponseBody">弹窗查看</a-button>
                    <a-button size="small" @click="downloadResponseBody">下载 TXT</a-button>
                  </div>
                </div>
                <p v-else class="helper">暂无响应报文</p>
              </div>
            </div>
          </a-card>

          <a-card
            v-if="detail.responseCode !== 0 && detail.errorMessage"
            title="错误详情"
            :bordered="false"
            class="detail-card"
          >
            <pre class="code-block">{{ detail.errorMessage }}</pre>
          </a-card>
        </div>
      </div>

      <a-empty v-else-if="!loading" description="未找到调用记录或加载失败" />
    </a-spin>

    <invocation-preview-drawer
      :visible="previewVisible"
      :invocation-id="invocationId"
      @close="previewVisible = false"
    />

    <invocation-response-body-modal
      :visible="responseBodyVisible"
      :invocation-id="invocationId"
      @close="responseBodyVisible = false"
    />
  </div>
</template>

<script>
import { getInvocationDetail, getInvocationResponseBody } from '@/api/openPlatform/invocation'
import EnumTag from '@/components/openPlatform/EnumTag'
import ResponseCodeTag from '@/components/openPlatform/ResponseCodeTag'
import InvocationPreviewDrawer from './components/InvocationPreviewDrawer'
import InvocationResponseBodyModal from './components/InvocationResponseBodyModal'

export default {
  name: 'InvocationDetail',
  components: { InvocationPreviewDrawer, InvocationResponseBodyModal, EnumTag, ResponseCodeTag },
  data () {
    return {
      loading: false,
      detail: null,
      previewVisible: false,
      responseBodyVisible: false
    }
  },
  computed: {
    invocationId () {
      return this.$route.params.invocationId
    }
  },
  watch: {
    invocationId: {
      immediate: true,
      handler () {
        this.loadDetail()
      }
    }
  },
  methods: {
    loadDetail () {
      if (!this.invocationId) return
      this.loading = true
      getInvocationDetail(this.invocationId).then(data => {
        this.detail = data || null
      }).catch(err => {
        this.detail = null
        this.$message.error((err && err.message) || '加载调用详情失败')
      }).finally(() => {
        this.loading = false
      })
    },
    goBack () {
      this.$router.push({ name: 'InvocationList' })
    },
    openPreview () {
      this.previewVisible = true
    },
    openResponseBody () {
      this.responseBodyVisible = true
    },
    downloadResponseBody () {
      if (!this.invocationId) return
      getInvocationResponseBody(this.invocationId).then(data => {
        const text = data && data.bodyFormatted
        if (!text) {
          this.$message.warning('暂无可下载内容')
          return
        }
        const filename = `${this.invocationId}-response.txt`
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        this.$message.success('已开始下载')
      }).catch(err => {
        this.$message.error((err && err.message) || '下载响应报文失败')
      })
    },
    goPartner (partnerId) {
      this.$router.push({ name: 'PartnerDetail', params: { partnerId } })
    },
    goWebhookDetail (webhook) {
      if (!webhook || webhook.id == null) return
      this.$router.push({
        name: 'WebhookDeliveryList',
        query: {
          partnerId: this.detail.partnerId,
          resourceId: webhook.resourceId || this.detail.resourceId,
          deliveryId: String(webhook.id)
        }
      })
    },
    copyText (text, label) {
      if (!text) {
        this.$message.warning('暂无可复制内容')
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
        this.$message.error('复制失败，请手动选择复制')
      }
      document.body.removeChild(ta)
    },
    formatDuration (latencyMs) {
      if (latencyMs === undefined || latencyMs === null || latencyMs === '') return '-'
      return `${latencyMs} ms`
    },
    formatDateTime (value) {
      if (!value) return '-'
      return this.$moment ? this.$moment(value).format('YYYY-MM-DD HH:mm:ss') : value
    },
    formatBytes (size) {
      if (size === undefined || size === null || size === '') return '-'
      const num = Number(size)
      if (Number.isNaN(num) || num <= 0) return '-'
      if (num < 1024) return `${num} B`
      if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
      return `${(num / 1024 / 1024).toFixed(2)} MB`
    }
  }
}
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin: 16px 0;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.detail-meta {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  margin-top: 4px;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.detail-card {
  margin-bottom: 16px;
}

.detail-card :deep(.ant-card-body) {
  padding: 12px 16px;
}

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

.timeline {
  border-left: 2px solid #f0f0f0;
  margin-left: 8px;
  padding-left: 16px;
}

.timeline-item {
  position: relative;
  padding-bottom: 16px;
  font-size: 13px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -21px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1890ff;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #1890ff;
}

.timeline-item.fail::before {
  background: #ff4d4f;
  box-shadow: 0 0 0 1px #ff4d4f;
}

.timeline-item .t {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.payload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .payload-grid {
    grid-template-columns: 1fr;
  }
}

.payload-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 6px;
  font-weight: 500;
}

.copy-link {
  margin-left: 8px;
  font-weight: normal;
}

.helper {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin: 0 0 8px;
}

.response-body-actions .action-row {
  display: flex;
  gap: 8px;
}

.code-block {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  padding: 12px;
  border-radius: 2px;
  font-size: 12px;
  overflow: auto;
  max-height: 320px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
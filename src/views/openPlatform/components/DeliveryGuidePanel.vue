<template>
  <a-collapse :bordered="false" default-active-key="guide" class="delivery-guide-panel">
    <a-collapse-panel key="guide" header="第三方接入说明（DeliveryGuidePanel）">
      <div class="guide-section">
        <div class="guide-title">1. 获取 Token</div>
        <pre class="code-block">{{ tokenCurlPreview }}</pre>
      </div>
      <div class="guide-section">
        <div class="guide-title">2. 创建任务（JSON 示例）</div>
        <pre class="code-block">{{ taskCurlPreview }}</pre>
      </div>
      <div class="guide-section">
        <div class="guide-title">3. 联调环境</div>
        <p class="guide-text">公网入口：<code>{{ publicBase }}</code>。后端 mock 模式时实例数据来自 fixture，运营在「调用记录」观测。</p>
      </div>
      <a-button size="small" @click="copyGuide">复制完整接入说明</a-button>
    </a-collapse-panel>
  </a-collapse>
</template>

<script>
import {
  buildDeliveryGuideText,
  getPartnerApiBaseUrl,
  getPartnerPublicBaseUrl,
  getPartnerTokenUrl
} from '@/utils/partnerAccess'

export default {
  name: 'DeliveryGuidePanel',
  props: {
    clientId: {
      type: String,
      default: ''
    },
    clientSecret: {
      type: String,
      default: ''
    },
    maskSecret: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    publicBase () {
      return getPartnerPublicBaseUrl()
    },
    tokenCurlPreview () {
      const secret = this.maskSecret ? '***' : (this.clientSecret || '***')
      return `curl -X POST "${getPartnerTokenUrl()}" \\\n  -d "grant_type=client_credentials&client_id=${this.clientId || 'cli_xxx'}&client_secret=${secret}"`
    },
    taskCurlPreview () {
      return `curl -X POST "${getPartnerApiBaseUrl()}/tasks/vul" \\\n  -H "Authorization: Bearer {token}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"extTaskId":"demo-001","taskName":"联调任务"}'`
    }
  },
  methods: {
    copyGuide () {
      const text = buildDeliveryGuideText(this.clientId, this.clientSecret)
      this.copyText(text, '接入说明')
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
.delivery-guide-panel {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 2px;
}

.delivery-guide-panel :deep(.ant-collapse-item) {
  border-bottom: none;
}

.guide-section + .guide-section {
  margin-top: 12px;
}

.guide-title {
  font-weight: 500;
  margin-bottom: 6px;
}

.guide-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: rgba(0, 0, 0, 0.65);
}

.code-block {
  background: #fff;
  border: 1px solid #f0f0f0;
  padding: 10px 12px;
  border-radius: 2px;
  font-size: 12px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
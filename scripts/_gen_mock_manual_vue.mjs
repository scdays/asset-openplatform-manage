import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(__dirname, '../src/views/openPlatform/MockManualIngest.vue')

const content = `<template>
  <div class="p_16 mock-manual-page">
    <a-breadcrumb>
      <a-breadcrumb-item>\u5f00\u653e\u5e73\u53f0</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">\u529f\u80fd\u603b\u89c8</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>Mock \u8054\u8c03</a-breadcrumb-item>
      <a-breadcrumb-item>\u534a\u4eba\u5de5\u62a5\u544a\u5bfc\u5165</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      v-if="!adminKeyReady"
      type="warning"
      show-icon
      message="\u672a\u914d\u7f6e Admin Key"
      description="\u8bf7\u5728 .env.development.local \u8bbe\u7f6e VUE_APP_OPEN_API_ADMIN_KEY\uff0c\u5426\u5219\u65e0\u6cd5\u8c03\u7528 /internal/admin/mock-tasks\u3002"
      style="margin: 16px 0;"
    />

    <a-card :bordered="false" class="mock-search-card">
      <a-form layout="vertical">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="16" :xl="8">
            <a-form-item label="\u5e73\u53f0 taskId">
              <a-input
                v-model="taskIdInput"
                placeholder="Partner \u5efa\u4efb\u52a1\u540e\u8fd4\u56de\u7684 taskId"
                allow-clear
                @pressEnter="loadTask"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="8" :xl="4">
            <a-form-item label=" " :colon="false">
              <a-button type="primary" :loading="loading" @click="loadTask">\u52a0\u8f7d\u4efb\u52a1</a-button>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <template v-if="dispatch">
      <a-row :gutter="16">
        <a-col :xs="24" :xl="12">
          <a-card title="\u4e0b\u53d1\u4e0a\u4e0b\u6587\uff08dispatch-packet\uff09" :bordered="false" class="mock-section-card">
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="taskId">
                <code>{{ dispatch.taskId }}</code>
              </a-descriptions-item>
              <a-descriptions-item label="extTaskId">{{ dispatch.extTaskId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="partnerId">{{ dispatch.partnerId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="\u4efb\u52a1\u72b6\u6001">
                <enum-tag type="openTaskStatus" :value="dispatch.status" />
              </a-descriptions-item>
              <a-descriptions-item label="ingest \u6a21\u5f0f">
                <enum-tag type="mockIngestMode" :value="dispatch.ingestMode" />
              </a-descriptions-item>
              <a-descriptions-item label="scanTemplateId">{{ dispatch.scanTemplateId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="reportTemplateId">{{ dispatch.reportTemplateId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="\u626b\u63cf\u76ee\u6807">
                <span v-if="dispatch.targets && dispatch.targets.length">
                  {{ dispatch.targets.join('\u3001') }}
                </span>
                <span v-else>-</span>
              </a-descriptions-item>
              <a-descriptions-item label="\u4efb\u52a1\u76ee\u5f55">
                <code class="dir-code">{{ dispatch.taskBundleDir }}</code>
              </a-descriptions-item>
            </a-descriptions>
            <div class="mock-hint">
              \u5c06\u4e0a\u8ff0\u76ee\u6807\u4e0e\u6a21\u677f\u5728 vuln-task-center / \u626b\u63cf\u5668\u4fa7\u4eba\u5de5\u6267\u884c\uff1b\u56de\u6536 XML \u540e\u5728\u672c\u9875\u5bfc\u5165\u3002
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :xl="12">
          <a-card title="Bundle / \u5165\u5e93\u72b6\u6001" :bordered="false" class="mock-section-card">
            <a-descriptions v-if="bundleStatus" :column="1" size="small" bordered>
              <a-descriptions-item label="\u5df2\u5165\u5e93">
                {{ bundleStatus.instancesIngested ? '\u662f' : '\u5426' }}
              </a-descriptions-item>
              <a-descriptions-item label="\u5e93\u5185\u5b9e\u4f8b\u6570">{{ bundleStatus.persistedInstanceCount }}</a-descriptions-item>
              <a-descriptions-item label="bundle \u5b9e\u4f8b\u6570">{{ bundleStatus.bundleInstanceCount }}</a-descriptions-item>
              <a-descriptions-item label="\u5df2\u6709 source.xml">{{ bundleStatus.hasSourceXml ? '\u662f' : '\u5426' }}</a-descriptions-item>
              <a-descriptions-item label="bundleId">{{ bundleStatus.bundleId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="\u5bfc\u5165\u65f6\u95f4">{{ bundleStatus.importedAt || '-' }}</a-descriptions-item>
              <a-descriptions-item label="ingest \u5907\u6ce8">
                <span :class="{ 'text-error': bundleStatus.ingestError }">
                  {{ bundleStatus.ingestError || '-' }}
                </span>
              </a-descriptions-item>
            </a-descriptions>
            <a-empty v-else description="\u52a0\u8f7d\u4efb\u52a1\u540e\u663e\u793a" />
          </a-card>
        </a-col>
      </a-row>
    </template>

    <a-card
      title="\u5bfc\u5165 NSFocus XML"
      :bordered="false"
      class="mock-section-card"
      style="margin-top: 16px;"
    >
      <a-alert
        v-if="!dispatch"
        type="info"
        show-icon
        message="\u8bf7\u5148\u8f93\u5165 taskId \u5e76\u70b9\u300c\u52a0\u8f7d\u4efb\u52a1\u300d"
        style="margin-bottom: 12px;"
      />

      <div class="mock-upload-row">
        <input
          ref="fileInput"
          type="file"
          accept=".xml,application/xml,text/xml"
          class="mock-file-input"
          @change="onNativeFileChange"
        />
        <a-button icon="upload" @click="openFilePicker">\u9009\u62e9 XML \u62a5\u544a</a-button>
        <span v-if="selectedFileName" class="mock-file-name">{{ selectedFileName }}</span>
        <a-button v-if="uploadFile" type="link" size="small" @click="clearFile">\u6e05\u9664</a-button>
        <a-checkbox
          v-model="forceReimport"
          :disabled="!bundleStatus || !bundleStatus.instancesIngested"
        >
          \u5f3a\u5236\u91cd\u5bfc\uff08\u6e05\u9664\u5df2\u5165\u5e93\u5b9e\u4f8b\uff09
        </a-checkbox>
      </div>

      <div class="mock-actions">
        <a-button :loading="previewing" @click="handlePreview">\u9884\u89c8\u89e3\u6790</a-button>
        <a-button type="primary" :loading="importing" @click="handleImport">
          \u786e\u8ba4\u5bfc\u5165\u5e76\u89e6\u53d1 FINISHED
        </a-button>
      </div>
      <div class="api-hint">POST /internal/admin/mock-tasks/{taskId}/preview-report \u00b7 import-report</div>

      <a-alert
        v-if="previewResult"
        type="info"
        show-icon
        style="margin-top: 12px;"
        :message="previewMessage"
      />

      <a-table
        v-if="previewResult && previewResult.samples && previewResult.samples.length"
        size="small"
        row-key="vulNetAddr"
        style="margin-top: 12px;"
        :pagination="false"
        :columns="previewColumns"
        :data-source="previewResult.samples"
      />
    </a-card>
  </div>
</template>

<script>
import EnumTag from '@/components/openPlatform/EnumTag'
import { hasAdminKey } from '@/utils/openApiRequest'
import {
  getBundleStatus,
  getDispatchPacket,
  importMockReport,
  previewMockReport,
  resolveUploadFile
} from '@/api/openPlatform/mockTask'

export default {
  name: 'MockManualIngest',
  components: { EnumTag },
  data () {
    return {
      taskIdInput: '',
      loading: false,
      previewing: false,
      importing: false,
      dispatch: null,
      bundleStatus: null,
      uploadFile: null,
      selectedFileName: '',
      forceReimport: false,
      previewResult: null,
      previewColumns: [
        { title: '\u6f0f\u6d1e\u540d\u79f0', dataIndex: 'vulName', ellipsis: true },
        { title: '\u8d44\u4ea7\u5730\u5740', dataIndex: 'vulNetAddr', width: 140 },
        { title: '\u7aef\u53e3', dataIndex: 'vulPort', width: 72 },
        { title: '\u7b49\u7ea7', dataIndex: 'vulLevel', width: 72 },
        { title: '\u72b6\u6001', dataIndex: 'vulInfoStat', width: 72 },
        { title: 'CVE/CNNVD', dataIndex: 'orgVulId', ellipsis: true }
      ]
    }
  },
  computed: {
    adminKeyReady () {
      return hasAdminKey()
    },
    previewMessage () {
      if (!this.previewResult) return ''
      return '\\u89e3\\u6790\\u9884\\u89c8\\uff1a\\u5171 ' + this.previewResult.totalCount + ' \\u6761\\uff0c\\u5c55\\u793a ' + this.previewResult.sampleSize + ' \\u6761\\u6837\\u672c'
    }
  },
  created () {
    const q = this.$route.query.taskId
    if (q) {
      this.taskIdInput = q
      this.loadTask()
    }
  },
  methods: {
    openFilePicker () {
      const input = this.$refs.fileInput
      if (input) {
        input.click()
      }
    },
    onNativeFileChange (event) {
      const file = event.target && event.target.files && event.target.files[0]
      if (!file) return
      const name = (file.name || '').toLowerCase()
      if (!name.endsWith('.xml')) {
        this.$message.warning('\u8bf7\u9009\u62e9 .xml \u683c\u5f0f\u7684\u62a5\u544a\u6587\u4ef6')
        this.clearFile()
        return
      }
      this.uploadFile = file
      this.selectedFileName = file.name
      this.previewResult = null
    },
    clearFile () {
      this.uploadFile = null
      this.selectedFileName = ''
      this.previewResult = null
      const input = this.$refs.fileInput
      if (input) {
        input.value = ''
      }
    },
    ensureImportReady () {
      const taskId = (this.taskIdInput || '').trim()
      if (!taskId) {
        this.$message.warning('\u8bf7\u8f93\u5165 taskId')
        return null
      }
      if (!this.dispatch) {
        this.$message.warning('\u8bf7\u5148\u70b9\u300c\u52a0\u8f7d\u4efb\u52a1\u300d\u786e\u8ba4\u4efb\u52a1\u5b58\u5728')
        return null
      }
      const file = resolveUploadFile(this.uploadFile)
      if (!file) {
        this.$message.warning('\u8bf7\u5148\u9009\u62e9 XML \u62a5\u544a\u6587\u4ef6')
        return null
      }
      return { taskId, file }
    },
    async loadTask () {
      const taskId = (this.taskIdInput || '').trim()
      if (!taskId) {
        this.$message.warning('\u8bf7\u8f93\u5165 taskId')
        return
      }
      this.loading = true
      this.previewResult = null
      try {
        const [dispatch, bundleStatus] = await Promise.all([
          getDispatchPacket(taskId),
          getBundleStatus(taskId)
        ])
        this.dispatch = dispatch
        this.bundleStatus = bundleStatus
        this.forceReimport = false
      } catch (e) {
        this.dispatch = null
        this.bundleStatus = null
      } finally {
        this.loading = false
      }
    },
    async handlePreview () {
      const ctx = this.ensureImportReady()
      if (!ctx) return
      this.previewing = true
      try {
        this.previewResult = await previewMockReport(ctx.taskId, ctx.file, 10)
        this.$message.success('\u9884\u89c8\u5b8c\u6210')
      } finally {
        this.previewing = false
      }
    },
    async handleImport () {
      const ctx = this.ensureImportReady()
      if (!ctx) return
      if (this.bundleStatus && this.bundleStatus.instancesIngested && !this.forceReimport) {
        this.$message.warning('\u5b9e\u4f8b\u5df2\u5165\u5e93\uff0c\u8bf7\u52fe\u9009\u300c\u5f3a\u5236\u91cd\u5bfc\u300d\u6216\u66f4\u6362 taskId')
        return
      }
      this.importing = true
      try {
        const result = await importMockReport(ctx.taskId, ctx.file, this.forceReimport)
        const ingestLabel = result.instancesIngested ? '\\u6210\\u529f' : '\\u672a\\u5b8c\\u6210'
        this.$message.success('\\u5bfc\\u5165\\u6210\\u529f\\uff1a' + result.instanceCount + ' \\u6761\\u5b9e\\u4f8b\\uff0c\\u5165\\u5e93 ' + ingestLabel)
        this.clearFile()
        await this.loadTask()
      } finally {
        this.importing = false
      }
    }
  }
}
</script>

<style scoped>
.mock-manual-page {
  background: #f0f2f5;
}

.mock-search-card,
.mock-section-card {
  margin-top: 16px;
}

.mock-hint {
  margin-top: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  line-height: 20px;
}

.dir-code {
  font-size: 12px;
  word-break: break-all;
}

.mock-file-input {
  display: none;
}

.mock-file-name {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mock-upload-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.mock-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.api-hint {
  margin-top: 8px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.text-error {
  color: #cf1322;
}
</style>
`

fs.writeFileSync(out, content, 'utf8')
console.log('written', out)

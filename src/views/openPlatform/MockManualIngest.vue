<template>
  <div class="p_16 mock-manual-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">功能总览</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>Mock 联调</a-breadcrumb-item>
      <a-breadcrumb-item>半人工报告导入</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      v-if="!adminKeyReady"
      type="warning"
      show-icon
      message="未配置 Admin Key"
      description="请在 .env.development.local 设置 VUE_APP_OPEN_API_ADMIN_KEY，否则无法调用 /internal/admin/mock-tasks。"
      style="margin: 16px 0;"
    />

    <a-card :bordered="false" class="mock-search-card">
      <a-form layout="vertical">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="16" :xl="8">
            <a-form-item label="平台 taskId">
              <a-input
                v-model="taskIdInput"
                placeholder="Partner 建任务后返回的 taskId"
                allow-clear
                @pressEnter="loadTask"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="8" :xl="4">
            <a-form-item label=" " :colon="false">
              <a-button type="primary" :loading="loading" @click="loadTask">加载任务</a-button>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <template v-if="dispatch">
      <a-row :gutter="16">
        <a-col :xs="24" :xl="12">
          <a-card title="下发上下文（dispatch-packet）" :bordered="false" class="mock-section-card">
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="taskId">
                <code>{{ dispatch.taskId }}</code>
              </a-descriptions-item>
              <a-descriptions-item label="extTaskId">{{ dispatch.extTaskId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="partnerId">{{ dispatch.partnerId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="任务状态">
                <enum-tag type="openTaskStatus" :value="dispatch.status" />
              </a-descriptions-item>
              <a-descriptions-item label="ingest 模式">
                <enum-tag type="mockIngestMode" :value="dispatch.ingestMode" />
              </a-descriptions-item>
              <a-descriptions-item label="scanTemplateId">{{ dispatch.scanTemplateId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="reportTemplateId">{{ dispatch.reportTemplateId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="扫描目标">
                <span v-if="dispatch.targets && dispatch.targets.length">
                  {{ dispatch.targets.join('、') }}
                </span>
                <span v-else>-</span>
              </a-descriptions-item>
              <a-descriptions-item label="任务目录">
                <code class="dir-code">{{ dispatch.taskBundleDir }}</code>
              </a-descriptions-item>
            </a-descriptions>
            <div class="mock-hint">
              将上述目标与模板在 vuln-task-center / 扫描器侧人工执行；回收 XML 后在本页导入。
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :xl="12">
          <a-card title="Bundle / 入库状态" :bordered="false" class="mock-section-card">
            <a-descriptions v-if="bundleStatus" :column="1" size="small" bordered>
              <a-descriptions-item label="已入库">
                {{ bundleStatus.instancesIngested ? '是' : '否' }}
              </a-descriptions-item>
              <a-descriptions-item label="库内实例数">{{ bundleStatus.persistedInstanceCount }}</a-descriptions-item>
              <a-descriptions-item label="bundle 实例数">{{ bundleStatus.bundleInstanceCount }}</a-descriptions-item>
              <a-descriptions-item label="已有 source.xml">{{ bundleStatus.hasSourceXml ? '是' : '否' }}</a-descriptions-item>
              <a-descriptions-item label="bundleId">{{ bundleStatus.bundleId || '-' }}</a-descriptions-item>
              <a-descriptions-item label="导入时间">{{ bundleStatus.importedAt || '-' }}</a-descriptions-item>
              <a-descriptions-item label="ingest 备注">
                <span :class="{ 'text-error': bundleStatus.ingestError }">
                  {{ bundleStatus.ingestError || '-' }}
                </span>
              </a-descriptions-item>
            </a-descriptions>
            <a-empty v-else description="加载任务后显示" />
          </a-card>
        </a-col>
      </a-row>
    </template>

    <a-card
      title="导入 NSFocus XML"
      :bordered="false"
      class="mock-section-card"
      style="margin-top: 16px;"
    >
      <a-alert
        v-if="!dispatch"
        type="info"
        show-icon
        message="请先输入 taskId 并点「加载任务」"
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
        <a-button icon="upload" @click="openFilePicker">选择 XML 报告</a-button>
        <span v-if="selectedFileName" class="mock-file-name">{{ selectedFileName }}</span>
        <a-button v-if="uploadFile" type="link" size="small" @click="clearFile">清除</a-button>
        <a-checkbox
          v-model="forceReimport"
          :disabled="!bundleStatus || !bundleStatus.instancesIngested"
        >
          强制重导（清除已入库实例）
        </a-checkbox>
      </div>

      <div class="mock-actions">
        <a-button :loading="previewing" @click="handlePreview">预览解析</a-button>
        <a-button type="primary" :loading="importing" @click="handleImport">
          确认导入并触发 FINISHED
        </a-button>
      </div>
      <div class="api-hint">POST /internal/admin/mock-tasks/{taskId}/preview-report · import-report</div>

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
        { title: '漏洞名称', dataIndex: 'vulName', ellipsis: true },
        { title: '资产地址', dataIndex: 'vulNetAddr', width: 140 },
        { title: '端口', dataIndex: 'vulPort', width: 72 },
        { title: '等级', dataIndex: 'vulLevel', width: 72 },
        { title: '状态', dataIndex: 'vulInfoStat', width: 72 },
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
      return '\u89e3\u6790\u9884\u89c8\uff1a\u5171 ' + this.previewResult.totalCount + ' \u6761\uff0c\u5c55\u793a ' + this.previewResult.sampleSize + ' \u6761\u6837\u672c'
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
        this.$message.warning('请选择 .xml 格式的报告文件')
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
        this.$message.warning('请输入 taskId')
        return null
      }
      if (!this.dispatch) {
        this.$message.warning('请先点「加载任务」确认任务存在')
        return null
      }
      const file = resolveUploadFile(this.uploadFile)
      if (!file) {
        this.$message.warning('请先选择 XML 报告文件')
        return null
      }
      return { taskId, file }
    },
    async loadTask () {
      const taskId = (this.taskIdInput || '').trim()
      if (!taskId) {
        this.$message.warning('请输入 taskId')
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
        this.$message.success('预览完成')
      } finally {
        this.previewing = false
      }
    },
    async handleImport () {
      const ctx = this.ensureImportReady()
      if (!ctx) return
      if (this.bundleStatus && this.bundleStatus.instancesIngested && !this.forceReimport) {
        this.$message.warning('实例已入库，请勾选「强制重导」或更换 taskId')
        return
      }
      this.importing = true
      try {
        const result = await importMockReport(ctx.taskId, ctx.file, this.forceReimport)
        const ingestLabel = result.instancesIngested ? '\u6210\u529f' : '\u672a\u5b8c\u6210'
        this.$message.success('\u5bfc\u5165\u6210\u529f\uff1a' + result.instanceCount + ' \u6761\u5b9e\u4f8b\uff0c\u5165\u5e93 ' + ingestLabel)
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

<template>
  <div class="mock-ingest-panel">
    <a-alert
      v-if="!adminKeyReady"
      type="warning"
      show-icon
      message="未配置 Admin Key"
      description="请在 window.conf 配置 VUE_APP_OPEN_API_ADMIN_KEY，用于调用 /internal/admin/mock-tasks。"
      style="margin-bottom: 12px;"
    />

    <a-row v-if="dispatch" :gutter="16">
      <a-col :xs="24" :xl="12">
        <a-card title="下发上下文" :bordered="false" size="small" class="mock-section-card">
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
            <a-descriptions-item label="扫描目标">
              <span v-if="dispatch.targets && dispatch.targets.length">{{ dispatch.targets.join('、') }}</span>
              <span v-else>-</span>
            </a-descriptions-item>
          </a-descriptions>
          <p class="mock-hint">仅支持绿盟 RSAS XML。扫描器侧执行完成后，在此导入报告并触发任务完成与实例入库。</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="12">
        <a-card title="入库状态" :bordered="false" size="small" class="mock-section-card">
          <a-descriptions v-if="bundleStatus" :column="1" size="small" bordered>
            <a-descriptions-item label="已入库">{{ bundleStatus.instancesIngested ? '是' : '否' }}</a-descriptions-item>
            <a-descriptions-item label="库内实例数">{{ bundleStatus.persistedInstanceCount }}</a-descriptions-item>
            <a-descriptions-item label="bundle 实例数">{{ bundleStatus.bundleInstanceCount }}</a-descriptions-item>
            <a-descriptions-item label="已有 source.xml">{{ bundleStatus.hasSourceXml ? '是' : '否' }}</a-descriptions-item>
            <a-descriptions-item label="导入时间">{{ bundleStatus.importedAt || '-' }}</a-descriptions-item>
            <a-descriptions-item label="备注">
              <span :class="{ 'text-error': bundleStatus.ingestError }">{{ bundleStatus.ingestError || '-' }}</span>
            </a-descriptions-item>
          </a-descriptions>
          <a-empty v-else description="加载中或任务不可用" />
        </a-card>
      </a-col>
    </a-row>

    <a-card title="导入绿盟 XML 报告" :bordered="false" size="small" class="mock-section-card" style="margin-top: 12px;">
      <div class="mock-upload-row">
        <input
          ref="fileInput"
          type="file"
          accept=".xml,application/xml,text/xml"
          class="mock-file-input"
          @change="onNativeFileChange"
        />
        <a-button icon="upload" :disabled="!taskId" @click="openFilePicker">选择 XML</a-button>
        <span v-if="selectedFileName" class="mock-file-name">{{ selectedFileName }}</span>
        <a-button v-if="uploadFile" type="link" size="small" @click="clearFile">清除文件</a-button>
        <a-checkbox
          v-model="forceReimport"
          :disabled="!bundleStatus || !bundleStatus.instancesIngested"
        >强制重导</a-checkbox>
        <a-button size="small" :loading="loading" style="margin-left: auto;" @click="loadTask">刷新状态</a-button>
      </div>
      <div class="mock-actions">
        <a-button :loading="previewing" :disabled="!taskId" @click="handlePreview">预览解析</a-button>
        <a-button type="primary" :loading="importing" :disabled="!taskId" @click="handleImport">确认导入</a-button>
      </div>
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
  name: 'MockNsfocusIngestPanel',
  components: { EnumTag },
  props: {
    taskId: { type: String, default: '' }
  },
  data () {
    return {
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
      return `解析预览：共 ${this.previewResult.totalCount} 条，展示 ${this.previewResult.sampleSize} 条样本`
    }
  },
  watch: {
    taskId: {
      immediate: true,
      handler (id) {
        if (id) this.loadTask()
        else {
          this.dispatch = null
          this.bundleStatus = null
        }
      }
    }
  },
  methods: {
    openFilePicker () {
      const input = this.$refs.fileInput
      if (input) input.click()
    },
    onNativeFileChange (event) {
      const file = event.target && event.target.files && event.target.files[0]
      if (!file) return
      const name = (file.name || '').toLowerCase()
      if (!name.endsWith('.xml')) {
        this.$message.warning('请选择 .xml 格式文件')
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
      if (input) input.value = ''
    },
    ensureImportReady () {
      const taskId = (this.taskId || '').trim()
      if (!taskId) {
        this.$message.warning('缺少 taskId')
        return null
      }
      if (!this.dispatch) {
        this.$message.warning('请先刷新任务状态')
        return null
      }
      const file = resolveUploadFile(this.uploadFile)
      if (!file) {
        this.$message.warning('请选择 XML 报告')
        return null
      }
      return { taskId, file }
    },
    async loadTask () {
      const taskId = (this.taskId || '').trim()
      if (!taskId) return
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
        this.$message.error((e && e.message) || '任务数据加载失败')
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
      } catch (e) {
        this.$message.error((e && e.message) || '预览失败')
      } finally {
        this.previewing = false
      }
    },
    async handleImport () {
      const ctx = this.ensureImportReady()
      if (!ctx) return
      if (this.bundleStatus && this.bundleStatus.instancesIngested && !this.forceReimport) {
        this.$message.warning('实例已入库，请勾选强制重导')
        return
      }
      this.importing = true
      try {
        const result = await importMockReport(ctx.taskId, ctx.file, this.forceReimport)
        const ingestLabel = result.instancesIngested ? '成功' : '未完成'
        this.$message.success(`导入完成：${result.instanceCount} 条实例，入库 ${ingestLabel}`)
        this.clearFile()
        await this.loadTask()
        this.$emit('imported', result)
      } catch (e) {
        this.$message.error((e && e.message) || '导入失败')
      } finally {
        this.importing = false
      }
    }
  }
}
</script>

<style scoped>
.mock-hint {
  margin-top: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  line-height: 20px;
}
.mock-file-input { display: none; }
.mock-file-name {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mock-upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.mock-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
.text-error { color: #cf1322; }
</style>

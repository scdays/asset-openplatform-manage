<template>
  <div class="p_16 open-task-list-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">控制台</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>风险排查</a-breadcrumb-item>
    </a-breadcrumb>

    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 16px;"
      message="运营视图：跨接入方查看 open_task 编排状态。task-center 模式下可观察双扫交叉（1001）与 autoVerify 双阶段进度。"
    />

    <a-card :bordered="false" class="search-card">
      <a-form layout="vertical">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="partnerId">
              <a-input v-model="queryParam.partnerId" placeholder="接入方 ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="taskId">
              <a-input v-model="queryParam.taskId" placeholder="平台任务 ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="extTaskId">
              <a-input v-model="queryParam.extTaskId" placeholder="接入方任务 ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="3">
            <a-form-item label="状态">
              <a-select v-model="queryParam.status" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in statusOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="3">
            <a-form-item label="scanTemplateId">
              <a-select v-model="queryParam.scanTemplateId" placeholder="全部" allow-clear>
                <a-select-option :value="1001">1001 漏洞扫描</a-select-option>
                <a-select-option :value="1002">1002 存活探测</a-select-option>
                <a-select-option :value="1003">1003 端口扫描</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="3">
            <a-form-item label="type">
              <a-select v-model="queryParam.vulnType" placeholder="全部" allow-clear>
                <a-select-option :value="1">1 漏洞扫描</a-select-option>
                <a-select-option :value="2">2 WEB</a-select-option>
                <a-select-option :value="3">3 口令猜测</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :xl="3">
            <a-form-item label=" " :colon="false">
              <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
              <a-button style="margin-left: 8px;" @click="resetQuery">重置</a-button>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card :bordered="false">
      <div class="toolbar">
        <span class="api-hint">GET /internal/admin/open-tasks</span>
      </div>
      <s-table
        ref="table"
        size="default"
        row-key="taskId"
        :columns="columns"
        :data="loadData"
        :alert="false"
        :pagination="pagination"
        show-pagination="auto"
      >
        <span slot="taskId" slot-scope="text">
          <code>{{ text }}</code>
        </span>
        <span slot="caseId" slot-scope="text, record">
          <a v-if="record.caseId" @click="goCase(record.caseId)"><code>{{ record.caseId }}</code></a>
          <span v-else class="muted">-</span>
        </span>
        <span slot="vulnType" slot-scope="text">
          <a-tag :color="vulnTypeColor(text)">{{ vulnTypeLabel(text) }}</a-tag>
        </span>
        <span slot="scanTemplateId" slot-scope="text">
          <code>{{ text }}</code>
          <span class="sub-hint">{{ scanTemplateHint(text) }}</span>
        </span>
        <span slot="autoVerify" slot-scope="text, record">
          <a-tag v-if="text" color="green">autoVerify</a-tag>
          <span v-else class="muted">false</span>
          <a-tag v-if="record.crossScan" color="purple" style="margin-left: 4px;">交叉扫描</a-tag>
        </span>
        <span slot="taskPhase" slot-scope="text">
          <span v-if="text === 1">排查</span>
          <span v-else-if="text === 2">验证</span>
          <span v-else>-</span>
        </span>
        <span slot="status" slot-scope="text">
          <enum-tag type="openTaskStatus" :value="text" />
        </span>
        <span slot="adapterMode" slot-scope="text">
          <a-tag>{{ text || '-' }}</a-tag>
        </span>
        <span slot="createdAt" slot-scope="text">{{ formatDateTime(text) }}</span>
        <span slot="action" slot-scope="text, record">
          <a @click="goWorkspace(record)">工作台</a>
          <template v-if="canRetryDispatch(record)">
            <a-divider type="vertical" />
            <a @click="retryDispatch(record)">重试下发</a>
          </template>
        </span>
      </s-table>
    </a-card>
  </div>
</template>

<script>
import { STable } from '@/components'
import EnumTag from '@/components/openPlatform/EnumTag'
import { optionsOf } from '@/constants/openPlatformDisplay'
import { listOpenTasks, retryOpenTaskDispatch } from '@/api/openPlatform/openTask'

const columns = [
  { title: 'taskId', dataIndex: 'taskId', scopedSlots: { customRender: 'taskId' }, width: 140 },
  { title: 'caseId', dataIndex: 'caseId', scopedSlots: { customRender: 'caseId' }, width: 140 },
  { title: 'extTaskId', dataIndex: 'extTaskId', width: 130, ellipsis: true },
  { title: 'partnerId', dataIndex: 'partnerId', width: 120, ellipsis: true },
  { title: '任务名称', dataIndex: 'taskName', ellipsis: true },
  { title: 'type', dataIndex: 'vulnType', scopedSlots: { customRender: 'vulnType' }, width: 110 },
  { title: '模板', dataIndex: 'scanTemplateId', scopedSlots: { customRender: 'scanTemplateId' }, width: 120 },
  { title: 'autoVerify', dataIndex: 'autoVerify', scopedSlots: { customRender: 'autoVerify' }, width: 150 },
  { title: '阶段', dataIndex: 'taskPhase', scopedSlots: { customRender: 'taskPhase' }, width: 72 },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 90 },
  { title: '引擎', dataIndex: 'adapterMode', scopedSlots: { customRender: 'adapterMode' }, width: 100 },
  { title: '实例', dataIndex: 'instanceCount', width: 64 },
  { title: '创建时间', dataIndex: 'createdAt', scopedSlots: { customRender: 'createdAt' }, width: 170 },
  { title: '操作', scopedSlots: { customRender: 'action' }, width: 120, fixed: 'right' }
]

export default {
  name: 'OpenTaskList',
  components: { STable, EnumTag },
  data () {
    return {
      columns,
      statusOptions: optionsOf('openTaskStatus', { includeAll: true }),
      queryParam: {
        partnerId: undefined,
        taskId: undefined,
        extTaskId: undefined,
        status: undefined,
        scanTemplateId: undefined,
        vulnType: undefined
      },
      pagination: {
        showTotal: total => `共 ${total} 条`,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50']
      }
    }
  },
  methods: {
    loadData (parameter) {
      const page = parameter.pageNo || parameter.current || 1
      const size = parameter.pageSize || 20
      return listOpenTasks({ ...this.queryParam, page, size }).then(res => ({
        data: (res && res.items) || [],
        pageNo: page,
        totalCount: (res && res.total) || 0
      }))
    },
    resetQuery () {
      this.queryParam = {
        partnerId: undefined,
        taskId: undefined,
        extTaskId: undefined,
        status: undefined,
        scanTemplateId: undefined,
        vulnType: undefined
      }
      this.$refs.table.refresh(true)
    },
    goWorkspace (record) {
      this.$router.push({ name: 'OpenTaskWorkspace', params: { taskId: record.taskId } })
    },
    goCase (caseId) {
      if (!caseId) return
      this.$router.push({ name: 'OperationCaseWorkspace', params: { caseId } })
    },
    canRetryDispatch (record) {
      return record && record.adapterMode === 'task-center' &&
        (record.status === 'DISPATCH_FAILED' || record.status === 'ACCEPTED')
    },
    retryDispatch (record) {
      if (!record || !record.taskId) return
      retryOpenTaskDispatch(record.taskId, { scanPhase: 1 })
        .then(data => {
          const ok = data && data.success
          const msg = (data && data.message) || (ok ? '重试下发成功' : '重试下发失败，请稍后重试')
          this.$message[ok ? 'success' : 'warning'](msg)
          this.$refs.table.refresh()
        })
        .catch(() => {
          this.$message.error('重试下发失败，请稍后重试或联系平台运维')
        })
    },
    vulnTypeLabel (v) {
      const map = { 1: '1 漏洞', 2: '2 WEB', 3: '3 口令' }
      return map[v] || v
    },
    vulnTypeColor (v) {
      return v === 3 ? 'orange' : v === 2 ? 'cyan' : 'blue'
    },
    scanTemplateHint (v) {
      const map = { 1001: '漏洞', 1002: '存活', 1003: '端口' }
      return map[v] ? ` ${map[v]}` : ''
    },
    formatDateTime (value) {
      if (!value) return '-'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return value
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
  }
}
</script>

<style scoped>
.open-task-list-page {
  background: #f0f2f5;
}
.search-card {
  margin-bottom: 16px;
}
.toolbar {
  margin-bottom: 12px;
}
.api-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-family: Consolas, monospace;
}
.sub-hint {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
}
.muted {
  color: rgba(0, 0, 0, 0.45);
}
</style>

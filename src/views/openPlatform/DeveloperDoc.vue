<template>
  <div class="p_16 developer-doc-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">控制台</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>开发指南</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" class="developer-doc-switch-card">
      <div class="switch-header">
        <div class="switch-title">开发指南（只读）</div>
        <a-radio-group v-model="activeTab" button-style="solid" size="small">
          <a-radio-button value="spec">接口规范</a-radio-button>
          <a-radio-button value="swagger">Swagger(OpenAPI)</a-radio-button>
        </a-radio-group>
      </div>
      <a-alert
        v-if="activeTab === 'spec'"
        type="info"
        show-icon
        message="接口规范"
        description="查看能力说明、鉴权方式和字段约束；文档内容由后端与平台配置维护。"
      />
      <a-alert
        v-else
        type="success"
        show-icon
        message="Swagger / OpenAPI"
        description="可直接打开 Swagger UI 或 OpenAPI JSON；页面不提供编辑能力。"
      />
    </a-card>

    <a-card :bordered="false" class="developer-doc-entry-card">
      <div class="entry-toolbar">
        <span class="api-hint">GET /internal/admin/developer-docs</span>
      </div>
      <a-row :gutter="12">
        <a-col :xs="24" :sm="12">
          <a-card size="small" class="doc-entry-card" title="接口规范入口">
            <p class="doc-entry-desc">供集成方查看能力说明、鉴权规则与调用示例。</p>
            <a-button type="primary" icon="link" @click="openDoc(specUrl)">打开接口规范</a-button>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-card size="small" class="doc-entry-card" title="Swagger(OpenAPI)">
            <p class="doc-entry-desc">查看实时接口定义与在线调试页面。</p>
            <div class="doc-entry-actions">
              <a-button type="primary" icon="api" @click="openDoc(swaggerUrl)">Swagger UI</a-button>
              <a-button @click="openDoc(openApiUrl)">OpenAPI JSON</a-button>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </a-card>

    <a-card :bordered="false" class="developer-doc-table-card">
      <div class="entry-toolbar">
        <span class="table-title">后端返回文档入口（兼容展示）</span>
      </div>
      <a-table
        :columns="columns"
        :data-source="docList"
        :pagination="false"
        row-key="rowKey"
        size="small"
      >
        <span slot="type" slot-scope="text">
          <a-tag :color="text === 'SWAGGER' || text === 'OPENAPI' ? 'green' : 'blue'">{{ text || '-' }}</a-tag>
        </span>
        <span slot="url" slot-scope="text">
          <a v-if="text" @click="openDoc(text)">{{ text }}</a>
          <span v-else>-</span>
        </span>
        <span slot="description" slot-scope="text">{{ text || '-' }}</span>
      </a-table>
    </a-card>
  </div>
</template>

<script>
import { listDeveloperDocs } from '@/api/openPlatform/catalog'

const columns = [
  { title: '名称', dataIndex: 'name', width: 220 },
  { title: '类型', dataIndex: 'type', scopedSlots: { customRender: 'type' }, width: 120 },
  { title: 'URL', dataIndex: 'url', scopedSlots: { customRender: 'url' } },
  { title: '说明', dataIndex: 'description', scopedSlots: { customRender: 'description' }, width: 220 }
]

export default {
  name: 'DeveloperDoc',
  data () {
    return {
      activeTab: 'spec',
      columns,
      docList: []
    }
  },
  computed: {
    specUrl () {
      const fromBackend = this.docList.find(item => item.type === 'SPEC')
      return fromBackend && fromBackend.url ? fromBackend.url : '/api/open/v1/docs'
    },
    swaggerUrl () {
      const fromBackend = this.docList.find(item => item.type === 'SWAGGER')
      return fromBackend && fromBackend.url ? fromBackend.url : '/swagger-ui/index.html'
    },
    openApiUrl () {
      const fromBackend = this.docList.find(item => item.type === 'OPENAPI')
      return fromBackend && fromBackend.url ? fromBackend.url : '/v3/api-docs'
    }
  },
  created () {
    this.loadDocs()
  },
  methods: {
    loadDocs () {
      listDeveloperDocs().then(data => {
        const list = Array.isArray(data) ? data : []
        const rows = list.map((item, index) => ({
          rowKey: `${item.type || 'DOC'}-${index}`,
          name: item.name || '未命名文档',
          type: (item.type || 'SPEC').toUpperCase(),
          url: item.url || '',
          description: item.description || ''
        }))
        this.docList = rows
      })
    },
    openDoc (url) {
      if (!url) {
        this.$message.warning('暂无可访问入口')
        return
      }
      const full = /^https?:\/\//.test(url) ? url : `${window.location.origin}${url}`
      window.open(full, '_blank')
    }
  }
}
</script>

<style scoped>
.developer-doc-page :deep(.ant-breadcrumb) {
  color: rgba(0, 0, 0, 0.65);
}

.developer-doc-switch-card {
  margin: 16px 0;
}

.developer-doc-switch-card :deep(.ant-card-body) {
  padding: 12px 16px 14px;
}

.switch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
  flex-wrap: wrap;
}

.switch-title {
  font-size: 14px;
  font-weight: 600;
}

.developer-doc-entry-card {
  margin-bottom: 16px;
}

.developer-doc-entry-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.doc-entry-card {
  margin-bottom: 12px;
}

.doc-entry-card :deep(.ant-card-head) {
  min-height: 36px;
}

.doc-entry-card :deep(.ant-card-head-title) {
  padding: 8px 0;
  font-size: 13px;
}

.doc-entry-desc {
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 12px;
  min-height: 40px;
}

.doc-entry-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.developer-doc-table-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.entry-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.api-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  font-family: Consolas, monospace;
  line-height: 22px;
}

.table-title {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>

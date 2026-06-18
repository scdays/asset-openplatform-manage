<template>
  <div class="p_16 api-catalog-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'OpenPlatformOverview' })">控制台</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>接口目录</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" class="api-catalog-search-card">
      <a-form layout="vertical" class="api-catalog-search-form">
        <a-row :gutter="16" type="flex" align="bottom">
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="能力码">
              <a-select v-model="queryParam.capabilityCode" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in capabilityFilterOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="状态">
              <a-select v-model="queryParam.status" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in apiStatusFilterOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="4">
            <a-form-item label="OpenAPI Tag">
              <a-select v-model="queryParam.tag" placeholder="全部" allow-clear>
                <a-select-option
                  v-for="item in tagFilterOptions"
                  :key="item.value || 'all'"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <a-form-item label="关键字">
              <a-input v-model="queryParam.keyword" placeholder="operationId / path" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="24" :xl="4" class="api-catalog-search-actions-col">
            <a-form-item label=" " :colon="false" class="api-catalog-search-actions-item">
              <div class="api-catalog-search-actions">
                <a-button type="primary" @click="$refs.table.refresh(true)">查询</a-button>
                <a-button @click="resetQuery">重置</a-button>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card :bordered="false" class="api-catalog-table-card">
      <div class="api-catalog-toolbar">
        <div class="api-catalog-toolbar-left">
          <span class="api-hint">GET /internal/admin/api-operations</span>
          <a-tag v-if="usingFallback" color="orange">接口未就绪，已切换兼容展示</a-tag>
        </div>
      </div>
      <s-table
        ref="table"
        size="default"
        row-key="rowKey"
        :columns="columns"
        :data="loadData"
        :alert="false"
        :pagination="pagination"
        show-pagination="auto"
      >
        <span slot="serial" slot-scope="text, record, index">{{ index + 1 }}</span>
        <span slot="operationId" slot-scope="text">
          <enum-tag v-if="text" type="apiOperation" :value="text" with-code />
          <span v-else>-</span>
        </span>
        <span slot="operationName" slot-scope="text">{{ text || '-' }}</span>
        <span slot="capabilityCode" slot-scope="text">
          <enum-tag type="capability" :value="text" />
        </span>
        <span slot="status" slot-scope="text">
          <enum-tag type="apiOperationStatus" :value="text" />
        </span>
        <span slot="method" slot-scope="text">
          <enum-tag type="httpMethod" :value="text" />
        </span>
        <span slot="path" slot-scope="text">{{ text || '-' }}</span>
        <span slot="tags" slot-scope="text">{{ formatTagList(text) }}</span>
      </s-table>
    </a-card>
  </div>
</template>

<script>
import { STable } from '@/components'
import EnumTag from '@/components/openPlatform/EnumTag'
import { formatTags, optionsOf } from '@/constants/openPlatformDisplay'
import { listApiCatalogOperations } from '@/api/openPlatform/catalog'

const columns = [
  { title: '序号', scopedSlots: { customRender: 'serial' }, width: 60 },
  { title: 'API 操作', dataIndex: 'operationId', scopedSlots: { customRender: 'operationId' }, width: 200 },
  { title: '名称', dataIndex: 'operationName', scopedSlots: { customRender: 'operationName' }, width: 180 },
  { title: '能力码', dataIndex: 'capabilityCode', scopedSlots: { customRender: 'capabilityCode' }, width: 180 },
  { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 110 },
  { title: 'Method', dataIndex: 'method', scopedSlots: { customRender: 'method' }, width: 100 },
  { title: 'Path', dataIndex: 'path', scopedSlots: { customRender: 'path' }, ellipsis: true },
  { title: 'Tag', dataIndex: 'tags', scopedSlots: { customRender: 'tags' }, width: 180 }
]

export default {
  name: 'ApiCatalog',
  components: { STable, EnumTag },
  data () {
    return {
      columns,
      capabilityFilterOptions: optionsOf('capability', { includeAll: true }),
      apiStatusFilterOptions: optionsOf('apiOperationStatus', { includeAll: true }),
      tagFilterOptions: optionsOf('openapiTag', { includeAll: true }),
      usingFallback: false,
      queryParam: {
        capabilityCode: undefined,
        status: undefined,
        tag: undefined,
        keyword: undefined
      },
      pagination: {
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: total => `共 ${total} 条`
      },
      loadData: parameter => {
        const page = parameter.pageNo || 1
        const size = parameter.pageSize || 10
        const params = Object.assign({}, this.queryParam, { page, size })
        return listApiCatalogOperations(params).then(data => {
          const items = ((data && data.items) || []).map((item, index) => ({
            rowKey: `${item.operationId || 'op'}-${page}-${index}`,
            ...item
          }))
          this.usingFallback = !!(data && data.fallback)
          return {
            data: items,
            pageNo: (data && data.page) || page,
            totalCount: data && data.total !== undefined ? data.total : items.length
          }
        })
      }
    }
  },
  methods: {
    formatTagList: formatTags,
    resetQuery () {
      this.queryParam = {
        capabilityCode: undefined,
        status: undefined,
        tag: undefined,
        keyword: undefined
      }
      this.$refs.table.refresh(true)
    },
  }
}
</script>

<style scoped>
.api-catalog-page :deep(.ant-breadcrumb) {
  color: rgba(0, 0, 0, 0.65);
}

.api-catalog-search-card {
  margin: 16px 0;
}

.api-catalog-search-card :deep(.ant-card-body) {
  padding: 12px 16px 10px;
}

.api-catalog-table-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.api-catalog-search-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.api-catalog-search-form :deep(.ant-form-item-label) {
  line-height: 1;
  padding-bottom: 4px;
}

.api-catalog-search-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  height: auto;
}

.api-catalog-search-actions-col {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
}

.api-catalog-search-actions-item :deep(.ant-form-item-label) {
  visibility: hidden;
}

.api-catalog-search-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
}

.api-catalog-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.api-catalog-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.api-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  font-family: Consolas, monospace;
  line-height: 32px;
}

.api-catalog-page :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}

@media (max-width: 1199px) {
  .api-catalog-search-actions-col {
    justify-content: flex-start;
    margin-top: 8px;
  }

  .api-catalog-search-form :deep(.ant-form-item) {
    margin-bottom: 8px;
  }

  .api-catalog-search-actions-col :deep(.ant-form-item) {
    margin-bottom: 0;
  }
}
</style>


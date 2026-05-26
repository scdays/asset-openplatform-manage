<template>
  <div class="p_16 overview-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>功能总览</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" style="margin: 16px 0;">
      <div class="overview-header">
        <div>
          <h2>集成管理后台 · 全功能站点地图</h2>
          <p>子应用路由自维护；顶栏菜单由主应用挂载。按阶段查看能力范围并快速进入已实现页面。</p>
        </div>
        <a-button type="primary" @click="$router.push({ name: 'PartnerList' })">进入合作方管理</a-button>
      </div>
    </a-card>

    <div class="overview-grid">
      <a-card v-for="item in items" :key="item.key" :bordered="false" class="overview-card">
        <div class="overview-card-title">
          <div>
            <a-tag :color="phaseColor(item.phase)">{{ item.phase }}</a-tag>
            <span>{{ item.title }}</span>
          </div>
          <a-button
            v-if="item.routeName"
            type="link"
            class="overview-card-action"
            @click="$router.push({ name: item.routeName })"
          >
            进入
          </a-button>
          <span v-else class="coming-soon">规划中</span>
        </div>
        <ul class="overview-list">
          <li v-for="(line, index) in item.lines" :key="`${item.key}-${index}`">{{ line }}</li>
        </ul>
      </a-card>
    </div>
  </div>
</template>

<script>
const items = [
  {
    key: 'partner',
    phase: 'P0',
    title: '合作方管理',
    routeName: 'PartnerList',
    lines: [
      '列表：GET /internal/admin/partners',
      '新建/编辑：POST / PUT',
      '详情：基本信息、能力、凭证、回调'
    ]
  },
  {
    key: 'invocation',
    phase: 'P1',
    title: 'API 调用记录',
    lines: [
      '调用列表与筛选',
      '调用详情（requestId / resourceId）',
      'Partner 统计能力联动'
    ]
  },
  {
    key: 'webhook',
    phase: 'P1',
    title: 'Webhook 投递',
    lines: [
      '投递日志查询',
      'HTTP 状态与重试次数',
      '支持按 Partner / 事件类型筛选'
    ]
  },
  {
    key: 'dashboard',
    phase: 'P2',
    title: '运营看板',
    lines: [
      '全局调用量 / 成功率',
      '按 Partner / API 维度分析',
      '错误码 Top 与趋势'
    ]
  },
  {
    key: 'catalog',
    phase: 'P2',
    title: 'API 目录',
    lines: [
      'api_operation 只读展示',
      '能力码与路径映射',
      '与 OpenAPI 保持一致'
    ]
  },
  {
    key: 'quota',
    phase: 'P2',
    title: '配额与限流',
    lines: [
      'Partner 级 QPS 统计',
      '429 触发趋势',
      '日配额使用率'
    ]
  },
  {
    key: 'version',
    phase: 'P3',
    title: 'API 版本管理',
    lines: [
      '版本发布与弃用时间表',
      '影响 Partner 通知',
      '版本策略追踪'
    ]
  },
  {
    key: 'alert',
    phase: 'P3',
    title: '告警规则',
    lines: [
      '错误率 / 延迟阈值',
      '通知渠道配置',
      'SLA 触发联动'
    ]
  }
]

export default {
  name: 'OpenPlatformOverview',
  data () {
    return {
      items
    }
  },
  methods: {
    phaseColor (phase) {
      if (phase === 'P0') return 'blue'
      if (phase === 'P1') return 'green'
      if (phase === 'P2') return 'orange'
      return 'purple'
    }
  }
}
</script>

<style scoped>
.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.overview-header h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.overview-header p {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.overview-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.overview-card-title span {
  font-weight: 500;
}

.overview-card-action {
  padding-right: 0;
}

.coming-soon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.overview-list {
  margin: 0;
  padding-left: 18px;
  color: rgba(0, 0, 0, 0.65);
}

.overview-list li {
  line-height: 24px;
}

@media (max-width: 1200px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>

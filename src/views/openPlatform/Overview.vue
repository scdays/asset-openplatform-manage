<template>
  <div class="p_16 overview-page">
    <a-breadcrumb>
      <a-breadcrumb-item>开放平台</a-breadcrumb-item>
      <a-breadcrumb-item>功能总览 / 站点地图</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :bordered="false" style="margin: 16px 0;">
      <div class="overview-header">
        <h2>集成管理后台 · 全功能站点地图</h2>
        <p>子应用 asset-openplatform-manage 内部路由由页面设计维护；按卡片查看能力范围，悬浮整卡可点击。</p>
      </div>

      <div class="overview-grid">
        <div
          v-for="item in items"
          :key="item.key"
          class="overview-card"
          :class="{ disabled: !item.routeName }"
          role="button"
          tabindex="0"
          @click="go(item)"
          @keydown.enter="go(item)"
          @keydown.space.prevent="go(item)"
        >
          <div class="overview-card-title">
            <div class="overview-card-left">
              <span class="overview-phase-dot" :class="`phase-dot-${item.phase.toLowerCase()}`" />
              <strong>{{ item.title }}</strong>
            </div>
            <span class="overview-phase-tag" :class="`phase-tag-${item.phase.toLowerCase()}`">{{ item.phase }}</span>
          </div>
          <ul class="overview-list">
            <li v-for="(line, index) in item.lines" :key="`${item.key}-${index}`">{{ line }}</li>
          </ul>
          <div class="overview-card-foot">
            <span v-if="item.routeName">悬浮并点击进入</span>
            <span v-else>规划中（暂未实现）</span>
          </div>
        </div>
      </div>
    </a-card>
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
      '详情：partnerId / 状态 / 凭证'
    ]
  },
  {
    key: 'invocation',
    phase: 'P1',
    title: 'API 调用记录',
    routeName: 'InvocationList',
    lines: [
      '调用列表与筛选',
      '支持分页查询',
      '失败原因与耗时分析'
    ]
  },
  {
    key: 'webhook',
    phase: 'P1',
    title: 'Webhook 投递',
    routeName: 'WebhookDeliveryList',
    lines: [
      '投递日志查询',
      'HTTP 状态与重试次数',
      '支持按 Partner / 事件类型过滤'
    ]
  },
  {
    key: 'dashboard',
    phase: 'P3',
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
    routeName: 'ApiCatalog',
    lines: [
      'api_operation 只读展示',
      '能力码与路径映射',
      '与 OpenAPI 保持一致'
    ]
  },
  {
    key: 'developerDoc',
    phase: 'P2',
    title: '开发者文档',
    routeName: 'DeveloperDoc',
    lines: [
      '支持查看接口规范',
      '支持跳转 Swagger / OpenAPI',
      '仅提供只读能力'
    ]
  },
  {
    key: 'mockManual',
    phase: 'P1',
    title: 'Mock 半人工导入',
    routeName: 'MockManualIngest',
    lines: [
      'manual ingest 模式联调',
      'dispatch-packet / 预览 / 导入 XML',
      '触发 FINISHED + 实例入库'
    ]
  },
  {
    key: 'mockE2e',
    phase: 'P1',
    title: 'Mock 全流程联调控制台',
    routeName: 'MockE2eConsole',
    lines: [
      '一键跑通 manual mock 全链路',
      'Partner / Token / 任务 / 导入 / 外发 / Webhook',
      '可替代 e2e-mock-manual-flow.ps1 脚本'
    ]
  },
  {
    key: 'socOrch',
    phase: 'W1',
    title: 'SOC 编排监控',
    routeName: 'OpenSocOrchestration',
    lines: [
      'Partner API 创建漏洞扫描任务',
      '轮询任务进度（编排模式走 vul-pass Internal API）',
      '需 orchestration.enabled=true'
    ]
  },
  {
    key: 'verifyFixOps',
    phase: 'W3',
    title: '修复核验运营',
    routeName: 'VerifyFixOps',
    lines: [
      'POST verify-fix 异步受理',
      '返回 verifyFixJobId / RUNNING',
      'vul-pass Kafka 回收后 6/7/10'
    ]
  },
  {
    key: 'quota',
    phase: 'P2',
    title: '配额与限流',
    routeName: 'QuotaLimit',
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
    go (item) {
      if (item.routeName) {
        this.$router.push({ name: item.routeName })
        return
      }
      this.$message.info(`${item.title} 处于规划阶段`)
    }
  }
}
</script>

<style scoped>
.overview-page {
  background: #f0f2f5;
}

.overview-header {
  margin-bottom: 14px;
}

.overview-header h2 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.overview-header p {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
  line-height: 20px;
  font-size: 13px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.overview-card {
  border: 1px solid #f0f0f0;
  border-radius: 2px;
  padding: 14px 16px 12px;
  background: #fff;
  transition: all 0.2s ease;
  cursor: pointer;
}

.overview-card:hover {
  border-color: #d9e8ff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.overview-card:focus {
  outline: 2px solid #bae7ff;
  outline-offset: 2px;
}

.overview-card.disabled {
  opacity: 0.92;
}

.overview-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.overview-card-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.overview-phase-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.phase-dot-p0 {
  background: #1890ff;
}

.phase-dot-p1 {
  background: #52c41a;
}

.phase-dot-p2 {
  background: #faad14;
}

.phase-dot-p3 {
  background: #722ed1;
}

.overview-phase-tag {
  font-size: 11px;
  line-height: 18px;
  border-radius: 2px;
  padding: 0 6px;
  border: 1px solid;
}

.phase-tag-p0 {
  color: #0958d9;
  border-color: #91d5ff;
  background: #e6f7ff;
}

.phase-tag-p1 {
  color: #389e0d;
  border-color: #b7eb8f;
  background: #f6ffed;
}

.phase-tag-p2 {
  color: #d46b08;
  border-color: #ffd591;
  background: #fff7e6;
}

.phase-tag-p3 {
  color: #531dab;
  border-color: #d3adf7;
  background: #f9f0ff;
}

.overview-list {
  margin: 0;
  padding-left: 18px;
  color: rgba(0, 0, 0, 0.65);
  min-height: 70px;
}

.overview-list li {
  line-height: 21px;
  font-size: 13px;
}

.overview-card-foot {
  margin-top: 6px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  border-top: 1px dashed #f0f0f0;
  padding-top: 8px;
}

@media (max-width: 1200px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>

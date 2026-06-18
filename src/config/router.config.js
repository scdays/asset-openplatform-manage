export const asyncRouterMap = [
  {
    path: '/overview',
    name: 'OpenPlatformOverview',
    component: () => import('@/views/openPlatform/Overview'),
    meta: { title: '功能总览' }
  },
  {
    path: '/partner',
    name: 'PartnerList',
    component: () => import('@/views/openPlatform/PartnerList'),
    meta: { title: '合作方列表', keepAlive: true }
  },
  {
    path: '/partner/create',
    name: 'PartnerCreate',
    component: () => import('@/views/openPlatform/PartnerForm'),
    meta: { title: '新建合作方' }
  },
  {
    path: '/partner/:partnerId/edit',
    name: 'PartnerEdit',
    component: () => import('@/views/openPlatform/PartnerForm'),
    meta: { title: '编辑合作方' }
  },
  {
    path: '/partner/:partnerId',
    name: 'PartnerDetail',
    component: () => import('@/views/openPlatform/PartnerDetail'),
    meta: { title: '合作方详情' }
  },
  {
    path: '/invocation',
    name: 'InvocationList',
    component: () => import('@/views/openPlatform/InvocationList'),
    meta: { title: '调用记录', keepAlive: true }
  },
  {
    path: '/invocation/:invocationId',
    name: 'InvocationDetail',
    component: () => import('@/views/openPlatform/InvocationDetail'),
    meta: { title: '调用详情' }
  },
  {
    path: '/webhook-log',
    name: 'WebhookDeliveryList',
    component: () => import('@/views/openPlatform/WebhookDeliveryList'),
    meta: { title: 'Webhook 投递日志', keepAlive: true }
  },
  {
    path: '/api-catalog',
    name: 'ApiCatalog',
    component: () => import('@/views/openPlatform/ApiCatalog'),
    meta: { title: 'API 目录', keepAlive: true }
  },
  {
    path: '/developer-doc',
    name: 'DeveloperDoc',
    component: () => import('@/views/openPlatform/DeveloperDoc'),
    meta: { title: '开发者文档' }
  },
  {
    path: '/quota',
    name: 'QuotaLimit',
    component: () => import('@/views/openPlatform/QuotaLimit'),
    meta: { title: '配额与限流', keepAlive: true }
  },
  {
    path: '/mock-manual',
    name: 'MockManualIngest',
    component: () => import('@/views/openPlatform/MockManualIngest'),
    meta: { title: 'Mock 半人工导入' }
  },
  {
    path: '/mock-e2e',
    name: 'MockE2eConsole',
    component: () => import('@/views/openPlatform/MockE2eConsole'),
    meta: { title: 'Mock 全流程联调' }
  },
  {
    path: '/soc-orchestration',
    name: 'OpenSocOrchestration',
    component: () => import('@/views/openPlatform/OpenSocOrchestration'),
    meta: { title: 'SOC 编排监控' }
  },
  {
    path: '/open-task/list',
    name: 'OpenTaskList',
    component: () => import('@/views/openPlatform/OpenTaskList'),
    meta: { title: 'OPEN 编排任务', keepAlive: true }
  },
  {
    path: '/open-task/workspace/:taskId',
    name: 'OpenTaskWorkspace',
    component: () => import('@/views/openPlatform/OpenTaskWorkspace'),
    meta: { title: '任务实例工作台' }
  },
  {
    path: '/verify-fix-ops',
    name: 'VerifyFixOps',
    component: () => import('@/views/openPlatform/VerifyFixOps'),
    meta: { title: '修复核验运营' }
  },
  {
    path: '/',
    redirect: '/overview'
  }
]

export const constantRouterMap = []

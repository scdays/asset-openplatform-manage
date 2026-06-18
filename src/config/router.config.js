export const asyncRouterMap = [
  {
    path: '/overview',
    name: 'OpenPlatformOverview',
    component: () => import('@/views/openPlatform/Overview'),
    meta: { title: '控制台' }
  },
  {
    path: '/partner',
    name: 'PartnerList',
    component: () => import('@/views/openPlatform/PartnerList'),
    meta: { title: '合作伙伴', keepAlive: true }
  },
  {
    path: '/partner/create',
    name: 'PartnerCreate',
    component: () => import('@/views/openPlatform/PartnerForm'),
    meta: { title: '新建合作伙伴' }
  },
  {
    path: '/partner/:partnerId/edit',
    name: 'PartnerEdit',
    component: () => import('@/views/openPlatform/PartnerForm'),
    meta: { title: '编辑合作伙伴' }
  },
  {
    path: '/partner/:partnerId',
    name: 'PartnerDetail',
    component: () => import('@/views/openPlatform/PartnerDetail'),
    meta: { title: '合作伙伴详情' }
  },
  {
    path: '/invocation',
    name: 'InvocationList',
    component: () => import('@/views/openPlatform/InvocationList'),
    meta: { title: '流量治理', keepAlive: true }
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
    meta: { title: '推送记录', keepAlive: true }
  },
  {
    path: '/api-catalog',
    name: 'ApiCatalog',
    component: () => import('@/views/openPlatform/ApiCatalog'),
    meta: { title: '接口目录', keepAlive: true }
  },
  {
    path: '/developer-doc',
    name: 'DeveloperDoc',
    component: () => import('@/views/openPlatform/DeveloperDoc'),
    meta: { title: '开发指南' }
  },
  {
    path: '/quota',
    name: 'QuotaLimit',
    component: () => import('@/views/openPlatform/QuotaLimit'),
    meta: { title: '流控策略', keepAlive: true }
  },
  {
    path: '/mock-manual',
    redirect: { name: 'OpenTaskList' }
  },
  {
    path: '/mock-e2e',
    name: 'MockE2eConsole',
    component: () => import('@/views/openPlatform/MockE2eConsole'),
    meta: { title: '接入测试' }
  },
  {
    path: '/soc-orchestration',
    redirect: to => ({ name: 'VerifyFixOps', query: to.query || {} })
  },
  {
    path: '/open-task/list',
    name: 'OpenTaskList',
    component: () => import('@/views/openPlatform/OpenTaskList'),
    meta: { title: '风险排查', keepAlive: true }
  },
  {
    path: '/open-task/workspace/:taskId',
    name: 'OpenTaskWorkspace',
    component: () => import('@/views/openPlatform/OpenTaskWorkspace'),
    meta: { title: '任务实例工作台' }
  },
  {
    path: '/operation-cases',
    name: 'OperationCaseList',
    component: () => import('@/views/openPlatform/OperationCaseList'),
    meta: { title: '运营案件', keepAlive: true }
  },
  {
    path: '/operation-cases/:caseId',
    name: 'OperationCaseWorkspace',
    component: () => import('@/views/openPlatform/OperationCaseWorkspace'),
    meta: { title: '运营案件工作台' }
  },
  {
    path: '/verify-fix-jobs',
    name: 'VerifyFixJobList',
    component: () => import('@/views/openPlatform/VerifyFixJobList'),
    meta: { title: '修复核验', keepAlive: true }
  },
  {
    path: '/verify-fix-jobs/:jobId',
    name: 'VerifyFixWorkspace',
    component: () => import('@/views/openPlatform/VerifyFixWorkspace'),
    meta: { title: '修复核验工作台' }
  },
  {
    path: '/verify-fix-ops',
    name: 'VerifyFixOps',
    component: () => import('@/views/openPlatform/VerifyFixOps'),
    meta: { title: '处置测试' }
  },
  {
    path: '/',
    redirect: '/overview'
  }
]

export const constantRouterMap = []

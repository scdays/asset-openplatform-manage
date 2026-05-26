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
    path: '/',
    redirect: '/overview'
  }
]

export const constantRouterMap = []

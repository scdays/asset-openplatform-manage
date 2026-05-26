# asset-openplatform-manage

开放平台 Partner 管理 qiankun 子应用，端口 **13021**，路由前缀 `/openPlatform`。

## 工程结构（精简后）

```
src/
  api/partner.js              # open-api-service /internal/admin/partners
  components/
    Table/                    # STable 列表
    openPlatform/AdminKeyAlert.vue
  constants/openPlatformCapabilities.js
  config/router.config.js
  views/openPlatform/
    PartnerList.vue | PartnerForm.vue | PartnerDetail.vue
    components/CapabilityCheckboxGroup.vue | CredentialCreateModal.vue
  utils/openApiRequest.js | filter.js
```

## 本地开发

推荐 **Node 18 LTS**（`.nvmrc`）。`npm run serve` 经 `scripts/run-vue-cli.js` 处理 OpenSSL 兼容。

```bash
cd project_frontend/asset/asset-openplatform-manage
npm install
cp .env.development.local.example .env.development.local
npm run serve
```

- 独立访问：`http://localhost:13021/partner`
- 主应用：`http://<master-host>/openPlatform/partner`（需 master 已注册子应用路由）

环境变量见 `.env.development.local.example`。

## 网关约束

- 平台自身管理请求（`/internal/admin/**`）走 `VUE_APP_OPEN_API_BASE_URL` + `VUE_APP_OPEN_API_PROXY_TARGET`，目标应是平台网关或平台内网 `open-api-service` 入口。
- 接入方开放请求（`/api/open/v1/**`、`/oauth/token`）才走 `partner-gateway`；管理页面不应把 Partner 管理 API 接到 partner-gateway。

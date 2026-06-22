<template>
  <div class="p_16 partner-form-page">
    <a-breadcrumb>
      <a-breadcrumb-item><a @click.prevent="$router.push({ name: 'OpenPlatformOverview' })">控制台</a></a-breadcrumb-item>
      <a-breadcrumb-item><a @click.prevent="goList">合作伙伴</a></a-breadcrumb-item>
      <a-breadcrumb-item>{{ isEdit ? '编辑合作方' : '新建合作方' }}</a-breadcrumb-item>
    </a-breadcrumb>

    <a-card :title="isEdit ? '编辑合作方' : '新建合作方'" style="margin-top: 16px;">
      <span slot="extra" class="api-hint">{{ isEdit ? 'PUT' : 'POST' }} /internal/admin/partners</span>
      <a-spin :spinning="loading">
        <a-form-model
          ref="form"
          :model="form"
          :rules="rules"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 14 }"
        >
          <a-form-model-item label="partnerId" prop="partnerId">
            <a-input
              v-model="form.partnerId"
              :disabled="isEdit"
              placeholder="SOC-CLIENT-A"
            />
            <div v-if="!isEdit" class="field-helper">创建后不可修改</div>
          </a-form-model-item>
          <a-form-model-item label="partnerName" prop="partnerName">
            <a-input v-model="form.partnerName" placeholder="SOC 能力中心" />
          </a-form-model-item>
          <a-form-model-item label="partnerType" prop="partnerType">
            <a-select v-model="form.partnerType" placeholder="请选择类型">
              <a-select-option v-for="t in partnerTypes" :key="t.value" :value="t.value">
                {{ t.label }}
              </a-select-option>
            </a-select>
          </a-form-model-item>
          <a-form-model-item v-if="isEdit" label="状态" prop="status">
            <a-select v-model="form.status">
              <a-select-option
                v-for="item in partnerStatusOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-model-item>
          <a-form-model-item label="rateLimitQps" prop="rateLimitQps">
            <a-input-number
              v-model="form.rateLimitQps"
              :min="1"
              style="width: 100%;"
              placeholder="空=不限"
            />
          </a-form-model-item>
          <a-form-model-item label="defaultCallbackUrl" prop="defaultCallbackUrl">
            <a-input
              v-model="form.defaultCallbackUrl"
              placeholder="https://partner.example.com/hooks/vuln"
            />
            <div class="field-helper">Partner 侧 Webhook 地址</div>
          </a-form-model-item>
          <a-form-model-item label="可下载外发阶段" prop="downloadableStages">
            <a-checkbox-group v-model="form.downloadableStages">
              <a-checkbox
                v-for="item in exportStageOptions"
                :key="item.value"
                :value="item.value"
                style="margin-left: 0; margin-right: 12px; line-height: 28px;"
              >
                {{ item.label }}
              </a-checkbox>
            </a-checkbox-group>
            <div class="field-helper">勾选该 Partner 允许下载的外发产物类型；不勾选则继承全局默认配置</div>
          </a-form-model-item>
          <a-form-model-item label="capabilities" prop="capabilities">
            <capability-checkbox-group v-model="form.capabilities" />
          </a-form-model-item>
          <a-form-model-item :wrapper-col="{ span: 14, offset: 6 }">
            <div class="form-actions">
              <a-button @click="goList">取消</a-button>
              <a-button type="primary" :loading="submitting" style="margin-left: 8px;" @click="handleSubmit">提交</a-button>
            </div>
          </a-form-model-item>
        </a-form-model>
      </a-spin>
    </a-card>
  </div>
</template>

<script>
import { getPartner, createPartner, updatePartner } from '@/api/partner'
import { PARTNER_TYPES, optionsOf } from '@/constants/openPlatformDisplay'
import CapabilityCheckboxGroup from './components/CapabilityCheckboxGroup'

export default {
  name: 'PartnerForm',
  components: { CapabilityCheckboxGroup },
  data () {
    return {
      partnerTypes: PARTNER_TYPES,
      partnerStatusOptions: optionsOf('partnerStatus'),
      exportStageOptions: optionsOf('exportStage'),
      loading: false,
      submitting: false,
      form: {
        partnerId: '',
        partnerName: '',
        partnerType: 'SIEM',
        status: 'ACTIVE',
        rateLimitQps: undefined,
        defaultCallbackUrl: '',
        downloadableStages: [],
        capabilities: []
      },
      rules: {
        partnerId: [{ required: true, message: '请输入 partnerId', trigger: 'blur' }],
        partnerName: [{ required: true, message: '请输入 partnerName', trigger: 'blur' }],
        capabilities: [{ required: true, type: 'array', min: 1, message: '请至少选择一项能力', trigger: 'change' }]
      }
    }
  },
  computed: {
    isEdit () {
      return !!this.$route.params.partnerId && this.$route.name === 'PartnerEdit'
    },
    partnerId () {
      return this.$route.params.partnerId
    }
  },
  created () {
    if (this.isEdit) {
      this.loadDetail()
    }
  },
  methods: {
    loadDetail () {
      this.loading = true
      getPartner(this.partnerId)
        .then(data => {
          this.form = {
            partnerId: data.partnerId,
            partnerName: data.partnerName,
            partnerType: data.partnerType || 'SIEM',
            status: data.status || 'ACTIVE',
            rateLimitQps: data.rateLimitQps,
            defaultCallbackUrl: data.defaultCallbackUrl || '',
            downloadableStages: this.parseStages(data.downloadableStages),
            capabilities: data.capabilities || []
          }
        })
        .finally(() => {
          this.loading = false
        })
    },
    handleSubmit () {
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.submitting = true
        const payload = {
          partnerName: this.form.partnerName,
          partnerType: this.form.partnerType,
          capabilities: this.form.capabilities,
          defaultCallbackUrl: this.form.defaultCallbackUrl || undefined,
          downloadableStages: this.formatStages(this.form.downloadableStages),
          rateLimitQps: this.form.rateLimitQps
        }
        const req = this.isEdit
          ? updatePartner(this.partnerId, { ...payload, status: this.form.status })
          : createPartner({
            partnerId: this.form.partnerId,
            ...payload
          })
        req
          .then(data => {
            this.$message.success('保存成功')
            const id = (data && data.partnerId) || this.form.partnerId
            if (!this.isEdit && data && data.webhookSecret) {
              sessionStorage.setItem(
                'openplatform.pendingWebhookSecret.' + id,
                JSON.stringify({ partnerId: id, webhookSecret: data.webhookSecret })
              )
              this.$router.push({
                name: 'PartnerDetail',
                params: { partnerId: id },
                query: { showWebhookSecret: '1' }
              })
              return
            }
            this.$router.push({ name: 'PartnerDetail', params: { partnerId: id } })
          })
          .finally(() => {
            this.submitting = false
          })
      })
    },
    goList () {
      this.$router.push({ name: 'PartnerList' })
    },
    parseStages (value) {
      if (!value) return []
      return String(value).split(',').map(v => v.trim()).filter(Boolean)
    },
    formatStages (arr) {
      // 空数组 → undefined（不传，后端保持原值 / 继承全局）；非空 → 逗号分隔
      if (!Array.isArray(arr) || !arr.length) return undefined
      return arr.map(v => String(v).trim()).filter(Boolean).join(',')
    }
  }
}
</script>

<style scoped>
.api-hint {
  font-family: Consolas, monospace;
  font-size: 12px;
  color: #531dab;
}

.partner-form-page :deep(.ant-card-body) {
  padding: 20px 20px 12px;
}

.partner-form-page :deep(.ant-form-item) {
  margin-bottom: 14px;
}

.field-helper {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
}

.form-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
</style>

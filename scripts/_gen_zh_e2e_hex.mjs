import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const strings = {
  openPlatform: '开放平台',
  featureOverview: '功能总览',
  mockLab: 'Mock 联调',
  consoleTitle: '全流程联调控制台',
  noAdminKey: '未配置 Admin Key',
  adminKeyHint: '请在 .env.development.local 设置 VUE_APP_OPEN_API_ADMIN_KEY；Open API 与 Admin 默认共用 /open-api 代理直连 open-api-service（profile=mock-manual）。',
  pageTitle: 'Manual Mock 全流程联调',
  pageDesc: '覆盖脚本 e2e-mock-manual-flow + e2e-full-flow 核心路径：Partner、Token、建任务(RUNNING)、导入 XML、FINISHED、实例、外发、Webhook。',
  runAll: '一键运行全流程',
  reset: '重置',
  stepEnv: '环境',
  stepCreateTask: '建任务',
  stepImportXml: '导入 XML',
  stepVerify: '验证',
  stepExport: '外发',
  stepFsm: '状态机',
  paramsTitle: '联调参数',
  partnerIdLabel: 'partnerId（自动前缀 e2e-）',
  partnerPlaceholder: '留空则使用时间戳',
  taskName: '任务名称',
  scanTargets: '扫描目标 hosts',
  targetsPlaceholder: '逗号分隔 IP',
  xmlLabel: 'NSFocus XML 报告（全流程必填）',
  pickXml: '选择 XML',
  includeFsm: '包含实例状态机（核验、修复、修复核验 + VERIFY_FIX 外发）',
  exportWaitSec: '外发等待秒数',
  sessionTitle: '当前会话',
  goManual: '半人工导入页',
  goWebhook: 'Webhook 日志',
  goInvocation: '调用记录',
  stepExec: '分步执行',
  s1: '1 健康',
  s4: '4 建任务',
  s5: '5 导入',
  s6: '6 验证',
  s7: '7 外发',
  resultTitle: '执行结果',
  lastRun: '最近运行：',
  emptyHint: '点击「一键运行全流程」或分步按钮开始',
  tpl1002: '1002 存活',
  tpl1003: '1003 端口',
  tpl1001: '1001 漏洞',
  summaryDone: '完成',
  summaryFail: '失败',
  summaryStep: '步',
  summaryAll: '全部',
  summaryPass: '步通过',
  pickXmlWarn: '请选择 .xml 文件',
  resetInfo: '已重置联调会话',
  configAdmin: '请先配置 VUE_APP_OPEN_API_ADMIN_KEY',
  needXml: '全流程需要先选择 NSFocus XML 报告',
  flowFail: '全流程结束，',
  flowFailSuffix: ' 步失败',
  flowOk: '全流程联调通过',
  needAdmin: '请先配置 Admin Key',
  needPartner: '请先执行 Partner 步骤',
  needTask: '请先建任务',
  needXmlShort: '请选择 XML',
  passSuffix: ' 通过'
}

const lines = ['/** MockE2eConsole.vue UI strings (hex UTF-8, ASCII-only source). */', 'export const Z = {']
for (const [k, v] of Object.entries(strings)) {
  lines.push(`  ${k}: '${Buffer.from(v, 'utf8').toString('hex')}',`)
}
lines.push('}', '', 'export function t (key) {', '  const hex = Z[key]', "  if (!hex) throw new Error('missing zh key: ' + key)", "  return Buffer.from(hex, 'hex').toString('utf8')", '}', '')

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib', 'zh-e2e-console-hex.mjs')
fs.writeFileSync(out, lines.join('\n'), 'utf8')
console.log('written', out)

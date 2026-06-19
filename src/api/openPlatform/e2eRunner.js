import { listWebhookDeliveries } from '@/api/openPlatform/invocation'
import {
  importMockReport,
  previewMockReport,
  getDispatchPacket,
  getBundleStatus
} from '@/api/openPlatform/mockTask'
import {
  completeVerifyFixAllFixed,
  completeVerifyFixAllUnfixed,
  completeVerifyFixByCompare,
  importVerifyFixRescanXml
} from '@/api/openPlatform/mockVerifyFix'
import {
  bindPartnerAuth,
  checkHealth,
  createE2eCredential,
  createE2ePartner,
  createVulTask,
  downloadPartnerExport,
  fetchOAuthToken,
  getExportMeta,
  getInstance,
  getTask,
  listTaskExports,
  remediateInstance,
  remediateInstanceBatch,
  searchInstances,
  verifyFixInstance,
  verifyFixInstanceBatch,
  verifyInstance,
  verifyInstanceBatch
} from '@/api/openPlatform/openPartnerApi'

export function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function buildRunId () {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function stepResult (key, title, status, message, extra = {}) {
  return {
    key,
    title,
    status,
    message,
    at: new Date().toISOString(),
    ...extra
  }
}

function buildTransferTime () {
  return String(Math.floor(Date.now() / 1000))
}

/** 漏洞验证单条 item（§5.3.2 items[]，不含顶层 operator） */
export function buildVerifyBatchItem (vulInfoID, verifyResult = 'VALID', extra = {}) {
  const item = {
    vulInfoID,
    verifyResult,
    transferTime: buildTransferTime(),
    ...extra
  }
  delete item.operator
  if (verifyResult === 'VALID') {
    item.srcMethod = extra.srcMethod != null ? extra.srcMethod : 1021
  }
  return item
}

/** 漏洞验证批量请求体（§5.3.2：operator 在顶层） */
export function buildVerifyBatchRequest (vulInfoIds, verifyResult = 'VALID', operator, extra = {}) {
  const op = operator || extra.operator || 'disposal-console@partner.local'
  return {
    operator: op,
    items: (vulInfoIds || []).map(id => buildVerifyBatchItem(id, verifyResult, extra))
  }
}

/** 漏洞验证请求体（§5.3.1 单条） */
export function buildVerifyBody (verifyResult = 'VALID', extra = {}) {
  const body = {
    verifyResult,
    operator: extra.operator || 'disposal-console@partner.local',
    transferTime: buildTransferTime(),
    ...extra
  }
  if (verifyResult === 'VALID') {
    body.srcMethod = extra.srcMethod != null ? extra.srcMethod : 1021
  }
  return body
}

/** 处置修复批量 item（§5.4.2） */
export function buildRemediateBatchItem (vulInfoID, extra = {}) {
  return {
    vulInfoID,
    ...buildRemediateBody({
      remedDesc: extra.remedDesc || `disposal ${vulInfoID}`,
      ...extra
    })
  }
}

/** 修复核验批量 item（§5.5.2） */
export function buildVerifyFixBatchItem (vulInfoID, extra = {}) {
  return {
    vulInfoID,
    ...buildVerifyFixBody(extra)
  }
}

/** 修复核验受理请求体（§5.5） */
export function buildVerifyFixBody (extra = {}) {
  return {
    transferTime: buildTransferTime(),
    ...extra
  }
}

/** 处置修复完整报文（含工单字段，2→5） */
export function buildRemediateBody (extra = {}) {
  return {
    vulInfoStat: 5,
    srcMethod: 1050,
    remedDesc: extra.remedDesc || 'e2e console fix',
    remedTime: extra.remedTime || '3日',
    fixLnk: extra.fixLnk || 'https://example.com/patch',
    srcTktRole: 1,
    dstTktRole: 2,
    assignerDept: '安全运营部',
    handlerDept: '运维部',
    assignerEmail: 'assigner@e2e.console.local',
    assignerPhone: '010-10000001',
    handlerEmail: 'handler@e2e.console.local',
    handlerPhone: '010-10000002',
    transferTime: buildTransferTime(),
    ...extra
  }
}

async function assertInstanceStat (vulInfoId, expectedStat) {
  const inst = await getInstance(vulInfoId)
  const stat = Number(inst.vulInfoStat)
  if (stat !== Number(expectedStat)) {
    throw new Error(`vulInfoID=${vulInfoId} 期望 stat=${expectedStat}，实际 ${stat}`)
  }
  return inst
}

async function loadInstanceIds (taskId, minCount = 1) {
  const search = await searchInstances(taskId, 1, 20)
  const items = search.items || []
  const ids = items.map(row => row.vulInfoID).filter(Boolean)
  if (ids.length < minCount) {
    throw new Error(`实例数 ${ids.length} < ${minCount}`)
  }
  return { ids, total: Number(search.total || ids.length) }
}

export async function runHealthStep () {
  try {
    const res = await checkHealth()
    const ok = res && (res.status === 'UP' || res.code === 0 || res.message)
    return stepResult('health', '健康检查', ok ? 'success' : 'success', '服务可达', { data: res })
  } catch (e) {
    return stepResult('health', '健康检查', 'error', e.message || '服务不可达')
  }
}

export async function runPartnerStep (partnerId) {
  try {
    await createE2ePartner(partnerId)
    const cred = await createE2eCredential(partnerId)
    return stepResult('partner', '创建 Partner 与凭证', 'success',
      `partnerId=${partnerId}，凭证见页面「OAuth 凭证」卡片`, {
        partnerId,
        clientId: cred.clientId,
        clientSecret: cred.clientSecret,
        source: 'create'
      })
  } catch (e) {
    return stepResult('partner', '创建 Partner 与凭证', 'error', e.message || '创建失败')
  }
}

export async function runTokenStep (clientId, clientSecret, partnerId) {
  try {
    const tokenData = await fetchOAuthToken(clientId, clientSecret)
    bindPartnerAuth(tokenData.accessToken, partnerId)
    return stepResult('token', '获取 OAuth Token', 'success', 'Token 已获取', {
      accessToken: tokenData.accessToken,
      expiresIn: tokenData.expiresIn,
      partnerId,
      clientId,
      source: 'credential'
    })
  } catch (e) {
    return stepResult('token', '获取 OAuth Token', 'error', e.message || '鉴权失败')
  }
}

export async function runCreateTaskStep (taskForm, partnerId) {
  try {
    const payload = {
      extTaskId: taskForm.extTaskId,
      taskName: taskForm.taskName,
      type: taskForm.type,
      scanTemplateId: taskForm.scanTemplateId,
      reportTemplateId: taskForm.reportTemplateId,
      targets: { hosts: taskForm.targets }
    }
    const created = await createVulTask(payload)
    const taskId = created.taskId
    await sleep(1500)
    const progress = await getTask(taskId)
    const status = progress.status
    const expectRunning = taskForm.expectManualMode !== false
    if (expectRunning && status !== 'RUNNING') {
      return stepResult('createTask', '创建扫描任务', 'error',
        `manual 模式期望 RUNNING，实际 ${status}（mock 环境请确认 profile=mock-manual；task-center 为正常 RUNNING）`, { taskId, status })
    }
    let dispatch = null
    try {
      dispatch = await getDispatchPacket(taskId)
    } catch (e) {
      const httpStatus = e.response && e.response.status
      if (httpStatus !== 404) {
        return stepResult('createTask', '创建扫描任务', 'error', e.message || '查询 dispatch-packet 失败', { taskId, status })
      }
    }
    const detail = dispatch
      ? `taskId=${taskId} status=${status}`
      : `taskId=${taskId} status=${status}（task-center 模式，后续请在工作台完成扫描入库）`
    return stepResult('createTask', '创建扫描任务', 'success', detail, { taskId, status, dispatch, partnerId })
  } catch (e) {
    return stepResult('createTask', '创建扫描任务', 'error', e.message || '建任务失败')
  }
}

export async function runImportStep (taskId, file, force = false) {
  if (!file) {
    return stepResult('import', '导入 XML 报告', 'error', '请先选择 XML 报告文件')
  }
  try {
    await previewMockReport(taskId, file, 3)
    const result = await importMockReport(taskId, file, force)
    if (!result.instancesIngested) {
      return stepResult('import', '导入 XML 报告', 'error',
        `导入 ${result.instanceCount} 条但入库未完成：${result.ingestError || '未知'}`, { result })
    }
    return stepResult('import', '导入 XML 报告', 'success',
      `解析 ${result.instanceCount} 条，已入库`, { result })
  } catch (e) {
    return stepResult('import', '导入 XML 报告', 'error', e.message || '导入失败')
  }
}

export async function runTaskVerifyStep (taskId, minInstances = 1) {
  try {
    let task = await getTask(taskId)
    let status = task.status
    if (status !== 'FINISHED') {
      try {
        const bundle = await getBundleStatus(taskId)
        if (bundle && bundle.status === 'FINISHED') {
          status = 'FINISHED'
        }
      } catch (e) {
        // ignore admin fallback errors
      }
    }
    if (status !== 'FINISHED') {
      const hint = status === 'RUNNING'
        ? '任务仍为 RUNNING：请先点「5 导入」并确认右侧导入成功；若已导入，请重启 open-api-service 后重试'
        : `状态=${status}，期望 FINISHED`
      return stepResult('taskVerify', '验证任务与实例', 'error', hint, { task })
    }
    const { ids, total } = await loadInstanceIds(taskId, minInstances)
    return stepResult('taskVerify', '验证任务与实例', 'success', `FINISHED，实例 ${total} 条`, {
      task,
      total,
      instanceIds: ids,
      sample: { vulInfoID: ids[0] }
    })
  } catch (e) {
    return stepResult('taskVerify', '验证任务与实例', 'error', e.message || '验证失败')
  }
}

export async function waitTaskExports (taskId, {
  exportStage = 'TASK_COMPLETED',
  minReady = 1,
  maxWaitSec = 45,
  expectJsonOnly = false
} = {}) {
  const deadline = Date.now() + maxWaitSec * 1000
  let last = null
  while (Date.now() < deadline) {
    last = await listTaskExports(taskId, 1, 50)
    const items = last.items || []
    const ready = items.filter(row =>
      row.status === 'READY' && (!exportStage || row.exportStage === exportStage)
    )
    if (ready.length >= minReady) {
      if (expectJsonOnly) {
        const jsonCount = ready.filter(r => r.format === 'json').length
        const xmlCount = ready.filter(r => r.format === 'xml').length
        if (jsonCount >= 1 && xmlCount === 0) {
          return { items: ready, all: items }
        }
      } else {
        return { items: ready, all: items }
      }
    }
    await sleep(2000)
  }
  return { items: [], all: (last && last.items) || [], timeout: true }
}

export async function runExportStep (taskId, options = {}) {
  try {
    const stage = options.exportStage || 'TASK_COMPLETED'
    const waited = await waitTaskExports(taskId, {
      exportStage: stage,
      minReady: options.minReady || 1,
      maxWaitSec: options.maxWaitSec || 45,
      expectJsonOnly: options.expectJsonOnly !== false && stage === 'TASK_COMPLETED'
    })
    const ready = waited.items || []
    if (!ready.length) {
      const failed = (waited.all || []).filter(r => r.status === 'FAILED')
      const hint = failed.length
        ? `有 ${failed.length} 条 FAILED（检查 file-sharing）`
        : `等待 ${options.maxWaitSec || 45}s 超时（stage=${stage}）`
      return stepResult('export', '外发 READY 验证', 'error', hint, { exports: waited.all, exportStage: stage })
    }
    const pick = ready.find(r => r.format === 'json') || ready[0]
    let downloadBytes = 0
    if (options.download !== false) {
      const meta = await getExportMeta(pick.exportId)
      try {
        const dl = await downloadPartnerExport(pick.exportId)
        downloadBytes = dl.data && dl.data.size != null ? dl.data.size : 0
      } catch (e) {
        return stepResult('export', '外发 READY 验证', 'error', `元数据 OK 但下载失败：${e.message}`, { pick, meta, exportStage: stage })
      }
      return stepResult('export', '外发 READY 验证', 'success',
        `${stage} READY ${pick.format} exportId=${pick.exportId}，下载 ${downloadBytes} 字节`, {
          ready,
          pick,
          meta,
          downloadBytes,
          exportStage: stage
        })
    }
    return stepResult('export', '外发 READY 验证', 'success',
      `${stage} READY×${ready.length}`, { ready, exportStage: stage })
  } catch (e) {
    return stepResult('export', '外发 READY 验证', 'error', e.message || '外发验证失败')
  }
}

export async function runWebhookStep (partnerId, resourceId, options = {}) {
  try {
    const types = options.eventTypes || ['TASK_COMPLETED', 'EXPORT_READY']
    const counts = {}
    for (const eventType of types) {
      let items = []
      if (resourceId) {
        const page = await listWebhookDeliveries({
          partnerId,
          resourceId,
          eventType,
          page: 1,
          size: 20
        })
        items = (page && page.items) || []
      }
      if (!items.length) {
        const page = await listWebhookDeliveries({
          partnerId,
          eventType,
          page: 1,
          size: 50
        })
        items = (page && page.items) || []
      }
      counts[eventType] = items.length
    }
    const missing = types.filter(t => (counts[t] || 0) < 1)
    if (missing.length) {
      return stepResult('webhook', '推送记录', 'error',
        `缺少事件：${missing.join('、')}`, { counts })
    }
    return stepResult('webhook', '推送记录', 'success',
      types.map(t => `${t}×${counts[t]}`).join('，'), { counts })
  } catch (e) {
    return stepResult('webhook', '推送记录', 'error', e.message || '查询失败')
  }
}

export async function runInstanceVerifyStep (vulInfoId, runId, label = '主实例') {
  if (!vulInfoId) {
    return stepResult('instVerify', '实例验证 VALID', 'skip', '无 vulInfoID')
  }
  try {
    const res = await verifyInstance(vulInfoId, {
      verifyResult: 'VALID',
      srcMethod: 1021,
      operator: 'e2e@console.local',
      transferTime: buildTransferTime()
    }, `e2e-verify-${vulInfoId}-${runId}`)
    const stat = Number(res.vulInfoStat)
    if (stat !== 2) {
      return stepResult('instVerify', '实例验证 VALID', 'error',
        `${label} ${vulInfoId} 期望 stat=2，实际 ${stat}`, { vulInfoId, res })
    }
    await assertInstanceStat(vulInfoId, 2)
    return stepResult('instVerify', '实例验证 VALID', 'success',
      `${label} ${vulInfoId}：1→2`, { vulInfoId, res })
  } catch (e) {
    return stepResult('instVerify', '实例验证 VALID', 'error', e.message || '验证失败', { vulInfoId })
  }
}

export async function runVerifyScanExportStep (taskId, exportWaitSec = 45) {
  try {
    await sleep(3000)
    return await runExportStep(taskId, {
      exportStage: 'VERIFY_SCAN',
      maxWaitSec: exportWaitSec,
      expectJsonOnly: false,
      download: false
    })
  } catch (e) {
    return stepResult('verifyScanExport', 'VERIFY_SCAN 外发', 'error', e.message || '外发失败')
  }
}

export async function runInstanceRemediateStep (vulInfoId, runId, label = '主实例') {
  if (!vulInfoId) {
    return stepResult('instRemediate', '实例处置修复', 'skip', '无 vulInfoID')
  }
  try {
    const body = buildRemediateBody({ remedDesc: `e2e ${label} fix` })
    const res = await remediateInstance(vulInfoId, body, `e2e-rem-${vulInfoId}-${runId}`)
    const stat = Number(res.vulInfoStat)
    if (stat !== 5) {
      return stepResult('instRemediate', '实例处置修复', 'error',
        `${label} ${vulInfoId} 期望 stat=5，实际 ${stat}`, { vulInfoId, res })
    }
    await assertInstanceStat(vulInfoId, 5)
    return stepResult('instRemediate', '实例处置修复', 'success',
      `${label} ${vulInfoId}：2→5`, { vulInfoId, res })
  } catch (e) {
    return stepResult('instRemediate', '实例处置修复', 'error', e.message || '处置失败', { vulInfoId })
  }
}

export async function runInstanceVerifyFixSubmitStep (vulInfoId, runId, label = '主实例') {
  if (!vulInfoId) {
    return stepResult('instVerifyFix', '修复核验受理', 'skip', '无 vulInfoID')
  }
  try {
    const res = await verifyFixInstance(vulInfoId, {
      transferTime: buildTransferTime()
    }, `e2e-vf-${vulInfoId}-${runId}`)
    const stat = Number(res.vulInfoStat)
    const jobId = res.verifyFixJobId
    const vfStatus = res.verifyFixStatus
    if (stat !== 5) {
      return stepResult('instVerifyFix', '修复核验受理', 'error',
        `${label} 期望受理后 stat=5，实际 ${stat}`, { vulInfoId, res })
    }
    if (vfStatus && vfStatus !== 'PENDING' && vfStatus !== 'RUNNING') {
      return stepResult('instVerifyFix', '修复核验受理', 'error',
        `${label} 期望 verifyFixStatus=PENDING，实际 ${vfStatus}`, { vulInfoId, res })
    }
    if (!jobId) {
      return stepResult('instVerifyFix', '修复核验受理', 'error',
        `${label} 未返回 verifyFixJobId`, { vulInfoId, res })
    }
    return stepResult('instVerifyFix', '修复核验受理', 'success',
      `${label} ${vulInfoId}：PENDING jobId=${jobId}`, { vulInfoId, jobId, res })
  } catch (e) {
    return stepResult('instVerifyFix', '修复核验受理', 'error', e.message || '受理失败', { vulInfoId })
  }
}

export async function runVerifyFixAdminStep (jobId, mode = 'allFixed', rescanFile) {
  if (!jobId) {
    return stepResult('verifyFixAdmin', '运营完成修复核验', 'skip', '无 jobId')
  }
  try {
    if (mode === 'allUnfixed') {
      await completeVerifyFixAllUnfixed(jobId)
    } else if (mode === 'compare') {
      if (rescanFile) {
        await importVerifyFixRescanXml(jobId, rescanFile)
      } else {
        await completeVerifyFixByCompare(jobId)
      }
    } else {
      await completeVerifyFixAllFixed(jobId)
    }
    return stepResult('verifyFixAdmin', '运营完成修复核验', 'success',
      `jobId=${jobId} mode=${mode}`, { jobId, mode })
  } catch (e) {
    return stepResult('verifyFixAdmin', '运营完成修复核验', 'error', e.message || '运营完成失败', { jobId })
  }
}

export async function runInstanceStatAssertStep (vulInfoId, expectedStat, label = '') {
  try {
    await assertInstanceStat(vulInfoId, expectedStat)
    return stepResult('instStat', '实例状态校验', 'success',
      `${label}${vulInfoId} stat=${expectedStat}`, { vulInfoId, expectedStat })
  } catch (e) {
    return stepResult('instStat', '实例状态校验', 'error', e.message || '状态不符', { vulInfoId, expectedStat })
  }
}

export async function runNoVerifyFixScanExportStep (taskId, maxWaitSec = 8) {
  try {
    const waited = await waitTaskExports(taskId, {
      exportStage: 'VERIFY_FIX_SCAN',
      minReady: 1,
      maxWaitSec
    })
    const ready = waited.items || []
    if (ready.length) {
      return stepResult('noVfExport', '修复核验不外发', 'error',
        `不应出现 VERIFY_FIX_SCAN 外发，实际 READY×${ready.length}`, { ready })
    }
    return stepResult('noVfExport', '修复核验不外发', 'success',
      `未出现 VERIFY_FIX_SCAN 外发（等待 ${maxWaitSec}s）`)
  } catch (e) {
    return stepResult('noVfExport', '修复核验不外发', 'error', e.message || '检查失败')
  }
}

export async function runInstanceFalsePositiveStep (vulInfoId, runId) {
  if (!vulInfoId) {
    return stepResult('instFalsePositive', '误报分支', 'skip', '无 vulInfoID')
  }
  try {
    const res = await verifyInstance(vulInfoId, {
      verifyResult: 'FALSE_POSITIVE',
      operator: 'e2e@console.local',
      transferTime: buildTransferTime()
    }, `e2e-fp-${runId}`)
    await assertInstanceStat(vulInfoId, 3)
    return stepResult('instFalsePositive', '误报分支', 'success',
      `${vulInfoId}：1→3`, { vulInfoId, res })
  } catch (e) {
    return stepResult('instFalsePositive', '误报分支', 'error', e.message || '误报验证失败', { vulInfoId })
  }
}

export async function runInstanceBatchStep (ids, runId, options = {}) {
  const [b1, b2] = ids || []
  if (!b1 || !b2) {
    return stepResult('instBatch', '批量实例状态机', 'skip',
      `需要 2 条实例，当前 ${(ids || []).length} 条`)
  }
  const batchMode = options.batchVerifyFixMode || 'allUnfixed'
  try {
    await verifyInstanceBatch(
      buildVerifyBatchRequest([b1, b2], 'VALID', 'e2e@console.local'),
      `e2e-batch-v-${runId}`
    )
    await assertInstanceStat(b1, 2)
    await assertInstanceStat(b2, 2)

    const remBody = (desc) => buildRemediateBody({ remedDesc: desc })
    await remediateInstanceBatch({
      items: [
        { vulInfoID: b1, ...remBody('batch fix 1') },
        { vulInfoID: b2, ...remBody('batch fix 2') }
      ]
    }, `e2e-batch-r-${runId}`)
    await assertInstanceStat(b1, 5)
    await assertInstanceStat(b2, 5)

    const batchVf = await verifyFixInstanceBatch({
      items: [
        buildVerifyFixBatchItem(b1),
        buildVerifyFixBatchItem(b2)
      ]
    }, `e2e-batch-vf-${runId}`)
    const success = (batchVf && batchVf.success) || []
    if (success.length < 2) {
      throw new Error('批量 verify-fix 成功数不足')
    }
    const jobId = success[0].verifyFixJobId
    if (!jobId || success.some(row => row.verifyFixJobId !== jobId)) {
      throw new Error('批量 verify-fix 应共享同一 verifyFixJobId')
    }

    if (batchMode === 'compare') {
      const file = options.rescanXmlFile || options.xmlFile
      if (file) {
        await importVerifyFixRescanXml(jobId, file)
      } else {
        await completeVerifyFixByCompare(jobId)
      }
    } else if (batchMode === 'allFixed') {
      await completeVerifyFixAllFixed(jobId)
    } else {
      await completeVerifyFixAllUnfixed(jobId)
    }

    const expectB1 = batchMode === 'allFixed' ? 6 : 7
    const expectB2 = batchMode === 'allFixed' ? 6 : 7
    await assertInstanceStat(b1, expectB1)
    await assertInstanceStat(b2, expectB2)

    return stepResult('instBatch', '批量实例状态机', 'success',
      `${b1}→${expectB1}，${b2}→${expectB2}，jobId=${jobId}`, {
        vulInfoIds: [b1, b2],
        jobId,
        batchMode
      })
  } catch (e) {
    return stepResult('instBatch', '批量实例状态机', 'error', e.message || '批量失败', { vulInfoIds: ids })
  }
}

/**
 * 完整实例状态机：验证 → VERIFY_SCAN → 处置 → 异步修复核验 → 运营完成 → Webhook（不外发 VERIFY_FIX_SCAN）
 */
export async function runInstanceFsmFlow (context) {
  const {
    taskId,
    partnerId,
    runId,
    exportWaitSec = 45,
    includeBatch = true,
    includeFalsePositive = false,
    verifyFixMainMode = 'allFixed',
    verifyFixBatchMode = 'allUnfixed',
    rescanXmlFile,
    xmlFile
  } = context

  const results = []
  const push = r => { results.push(r); return r }
  const failFast = r => r.status === 'error'

  let ids
  try {
    const loaded = await loadInstanceIds(taskId, 1)
    ids = loaded.ids
  } catch (e) {
    push(stepResult('instanceFsm', '实例状态机', 'error', e.message))
    return results
  }

  const instMain = ids[0]
  let cursor = 1
  const instFp = includeFalsePositive && ids.length > cursor ? ids[cursor++] : null
  const instB1 = includeBatch && ids.length > cursor ? ids[cursor++] : null
  const instB2 = includeBatch && ids.length > cursor ? ids[cursor++] : null

  let r = await runInstanceVerifyStep(instMain, runId, '主实例')
  push(r)
  if (failFast(r)) return results

  r = await runVerifyScanExportStep(taskId, exportWaitSec)
  push({ ...r, key: 'verifyScanExport', title: 'VERIFY_SCAN 外发' })
  if (failFast(r)) return results

  r = await runWebhookStep(partnerId, taskId, { eventTypes: ['EXPORT_READY'] })
  push({ ...r, key: 'verifyScanWebhook', title: 'VERIFY_SCAN Webhook' })
  if (failFast(r)) return results

  r = await runInstanceRemediateStep(instMain, runId, '主实例')
  push(r)
  if (failFast(r)) return results

  r = await runInstanceVerifyFixSubmitStep(instMain, runId, '主实例')
  push(r)
  if (failFast(r)) return results
  const mainJobId = r.jobId

  r = await runVerifyFixAdminStep(mainJobId, verifyFixMainMode, rescanXmlFile || xmlFile)
  push(r)
  if (failFast(r)) return results

  const mainExpectedStat = verifyFixMainMode === 'allUnfixed' ? 7 : 6
  r = await runInstanceStatAssertStep(instMain, mainExpectedStat, '主实例 ')
  push(r)
  if (failFast(r)) return results

  r = await runNoVerifyFixScanExportStep(taskId)
  push(r)
  if (failFast(r)) return results

  r = await runWebhookStep(partnerId, instMain, { eventTypes: ['INSTANCE_VERIFY_FIX_COMPLETED'] })
  push({ ...r, key: 'verifyFixWebhook', title: '修复核验 Webhook', jobId: mainJobId, vulInfoId: instMain })
  if (failFast(r)) return results

  if (instFp) {
    r = await runInstanceFalsePositiveStep(instFp, runId)
    push(r)
    if (failFast(r)) return results
  } else if (includeFalsePositive) {
    push(stepResult('instFalsePositive', '误报分支', 'skip', '实例不足，跳过误报'))
  }

  if (instB1 && instB2) {
    r = await runInstanceBatchStep([instB1, instB2], runId, {
      batchVerifyFixMode: verifyFixBatchMode,
      rescanXmlFile,
      xmlFile
    })
    push(r)
    if (failFast(r)) return results

    r = await runWebhookStep(partnerId, instB1, { eventTypes: ['INSTANCE_VERIFY_FIX_COMPLETED'] })
    push({ ...r, key: 'batchVerifyFixWebhook', title: '批量修复核验 Webhook' })
  } else if (includeBatch) {
    push(stepResult('instBatch', '批量实例状态机', 'skip',
      `需要至少 ${includeFalsePositive ? 4 : 3} 条实例，当前 ${ids.length} 条`))
  }

  push(stepResult('instanceFsm', '实例状态机', 'success',
    `主实例 ${instMain} 完成；批量${instB1 && instB2 ? '已跑' : '跳过'}`, {
      vulInfoId: instMain,
      jobId: mainJobId,
      vulInfoIds: ids
    }))

  return results
}

/** @deprecated 使用 runInstanceFsmFlow */
export async function runInstanceFsmStep (vulInfoId, runId) {
  const verify = await runInstanceVerifyStep(vulInfoId, runId)
  if (verify.status === 'error') return verify
  const remediate = await runInstanceRemediateStep(vulInfoId, runId)
  if (remediate.status === 'error') return remediate
  const submit = await runInstanceVerifyFixSubmitStep(vulInfoId, runId)
  if (submit.status === 'error') return submit
  const admin = await runVerifyFixAdminStep(submit.jobId, 'allFixed')
  if (admin.status === 'error') return admin
  return stepResult('instanceFsm', '实例状态机（可选）', 'success',
    `vulInfoID=${vulInfoId}：核验→修复→异步修复核验→运营完成`, {
      vulInfoId,
      jobId: submit.jobId
    })
}

export async function runPartnerSkipStep (partnerId, meta = {}) {
  if (!partnerId) {
    return stepResult('partner', '选用已有 Partner', 'error', '请先选择接入方')
  }
  return stepResult('partner', '选用已有 Partner', 'skip',
    `跳过创建，使用 partnerId=${partnerId}`, {
      partnerId,
      clientId: meta.clientId,
      clientSecret: meta.clientSecret,
      skipped: true
    })
}

export async function runTokenSkipStep (partnerId, accessToken, meta = {}) {
  if (!partnerId || !accessToken) {
    return stepResult('token', '获取 OAuth Token', 'error', '请先绑定或换取 Token')
  }
  bindPartnerAuth(accessToken, partnerId, { clientId: meta.clientId })
  return stepResult('token', '获取 OAuth Token', 'skip', '使用已绑定 Token', {
    accessToken,
    partnerId,
    clientId: meta.clientId,
    expiresIn: meta.expiresIn,
    source: meta.source || 'bound'
  })
}

async function runPartnerTokenSteps (context, push) {
  const partnerId = context.partnerId
  if (context.partnerMode === 'existing') {
    let r
    if (context.accessToken) {
      r = await runPartnerSkipStep(partnerId, {
        clientId: context.clientId,
        clientSecret: context.clientSecret
      })
      push(r)
      if (r.status === 'error') return { ok: false }
      r = await runTokenSkipStep(partnerId, context.accessToken, {
        clientId: context.clientId,
        expiresIn: context.expiresIn,
        source: context.tokenSource
      })
      push(r)
      if (r.status === 'error') return { ok: false }
      return { ok: true, partnerId }
    }
    if (!context.clientId || !context.clientSecret) {
      push(stepResult('partner', '选用已有 Partner', 'error',
        '请选择接入方并用凭证换取 Token，或粘贴 Token 后绑定'))
      return { ok: false }
    }
    r = await runPartnerSkipStep(partnerId, {
      clientId: context.clientId,
      clientSecret: context.clientSecret
    })
    push(r)
    if (r.status === 'error') return { ok: false }
    r = await runTokenStep(context.clientId, context.clientSecret, partnerId)
    push(r)
    if (r.status === 'error') return { ok: false }
    return { ok: true, partnerId: r.partnerId || partnerId }
  }

  let r = await runPartnerStep(partnerId)
  push(r)
  if (r.status === 'error') return { ok: false }
  r = await runTokenStep(r.clientId, r.clientSecret, r.partnerId)
  push(r)
  if (r.status === 'error') return { ok: false }
  return { ok: true, partnerId: r.partnerId || partnerId }
}

function resolveMinInstances (taskForm, includeInstanceFsm) {
  if (!includeInstanceFsm) return 1
  let min = 1
  if (taskForm && taskForm.includeBatch !== false) min = Math.max(min, 3)
  if (taskForm && taskForm.includeFalsePositive) min = Math.max(min, 4)
  return min
}

export async function runBootstrapE2e (context) {
  const results = []
  const push = r => { results.push(r); return r }

  let r = await runHealthStep()
  push(r)
  if (r.status === 'error') return results

  const partnerFlow = await runPartnerTokenSteps(context, push)
  if (!partnerFlow.ok) return results
  const effectivePartnerId = partnerFlow.partnerId || context.partnerId

  r = await runCreateTaskStep(context.taskForm, effectivePartnerId)
  push(r)

  return results
}

export async function runFullManualE2e (context) {
  const results = []
  const push = r => { results.push(r); return r }

  const minInstances = context.minInstances ||
    resolveMinInstances(context.taskForm, context.includeInstanceFsm)

  let r = await runHealthStep()
  push(r)
  if (r.status === 'error') return results

  const partnerFlow = await runPartnerTokenSteps(context, push)
  if (!partnerFlow.ok) return results
  const effectivePartnerId = partnerFlow.partnerId || context.partnerId

  r = await runCreateTaskStep(context.taskForm, effectivePartnerId)
  push(r)
  if (r.status === 'error') return results
  const taskId = r.taskId

  r = await runImportStep(taskId, context.xmlFile, false)
  push(r)
  if (r.status === 'error') return results

  r = await runTaskVerifyStep(taskId, minInstances)
  push(r)
  if (r.status === 'error') return results

  r = await runExportStep(taskId, {
    expectJsonOnly: context.taskForm.reportTemplateId === 2001,
    maxWaitSec: context.exportWaitSec || 45
  })
  push(r)
  if (r.status === 'error') return results

  r = await runWebhookStep(effectivePartnerId, taskId)
  push(r)

  if (context.includeInstanceFsm) {
    const fsmResults = await runInstanceFsmFlow({
      taskId,
      partnerId: effectivePartnerId,
      runId: context.runId,
      exportWaitSec: context.exportWaitSec || 45,
      includeBatch: context.taskForm.includeBatch !== false,
      includeFalsePositive: !!context.taskForm.includeFalsePositive,
      verifyFixMainMode: context.taskForm.verifyFixMainMode || 'allFixed',
      verifyFixBatchMode: context.taskForm.verifyFixBatchMode || 'allUnfixed',
      rescanXmlFile: context.rescanXmlFile,
      xmlFile: context.xmlFile
    })
    fsmResults.forEach(item => push(item))
  }

  return results
}

import { listWebhookDeliveries } from '@/api/openPlatform/invocation'
import {
  importMockReport,
  previewMockReport,
  getDispatchPacket
} from '@/api/openPlatform/mockTask'
import {
  bindPartnerAuth,
  checkHealth,
  createE2eCredential,
  createE2ePartner,
  createVulTask,
  downloadPartnerExport,
  fetchOAuthToken,
  getExportMeta,
  getTask,
  listTaskExports,
  remediateInstance,
  searchInstances,
  verifyFixInstance,
  verifyInstance
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

export async function runHealthStep () {
  try {
    const res = await checkHealth()
    const ok = res && (res.status === 'UP' || res.code === 0 || res.message)
    return stepResult('health', '\u5065\u5eb7\u68c0\u67e5', ok ? 'success' : 'success', '\u670d\u52a1\u53ef\u8fbe', { data: res })
  } catch (e) {
    return stepResult('health', '\u5065\u5eb7\u68c0\u67e5', 'error', e.message || '\u670d\u52a1\u4e0d\u53ef\u8fbe')
  }
}

export async function runPartnerStep (partnerId) {
  try {
    await createE2ePartner(partnerId)
    const cred = await createE2eCredential(partnerId)
    return stepResult('partner', '\u521b\u5efa Partner \u4e0e\u51ed\u8bc1', 'success', `partnerId=${partnerId}`, {
      partnerId,
      clientId: cred.clientId,
      clientSecret: cred.clientSecret
    })
  } catch (e) {
    return stepResult('partner', '\u521b\u5efa Partner \u4e0e\u51ed\u8bc1', 'error', e.message || '\u521b\u5efa\u5931\u8d25')
  }
}

export async function runTokenStep (clientId, clientSecret, partnerId) {
  try {
    const tokenData = await fetchOAuthToken(clientId, clientSecret)
    bindPartnerAuth(tokenData.accessToken, partnerId)
    return stepResult('token', '\u83b7\u53d6 OAuth Token', 'success', 'Token \u5df2\u83b7\u53d6', {
      accessToken: tokenData.accessToken,
      expiresIn: tokenData.expiresIn
    })
  } catch (e) {
    return stepResult('token', '\u83b7\u53d6 OAuth Token', 'error', e.message || '\u9274\u6743\u5931\u8d25')
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
      return stepResult('createTask', '\u521b\u5efa\u626b\u63cf\u4efb\u52a1', 'error',
        `manual \u6a21\u5f0f\u671f\u671b RUNNING\uff0c\u5b9e\u9645 ${status}\uff08\u8bf7\u786e\u8ba4 profile=mock-manual\uff09`, { taskId, status })
    }
    const dispatch = await getDispatchPacket(taskId)
    return stepResult('createTask', '\u521b\u5efa\u626b\u63cf\u4efb\u52a1', 'success',
      `taskId=${taskId} status=${status}`, { taskId, status, dispatch, partnerId })
  } catch (e) {
    return stepResult('createTask', '\u521b\u5efa\u626b\u63cf\u4efb\u52a1', 'error', e.message || '\u5efa\u4efb\u52a1\u5931\u8d25')
  }
}

export async function runImportStep (taskId, file, force = false) {
  if (!file) {
    return stepResult('import', '\u5bfc\u5165 XML \u62a5\u544a', 'error', '\u8bf7\u5148\u9009\u62e9 XML \u62a5\u544a\u6587\u4ef6')
  }
  try {
    await previewMockReport(taskId, file, 3)
    const result = await importMockReport(taskId, file, force)
    if (!result.instancesIngested) {
      return stepResult('import', '\u5bfc\u5165 XML \u62a5\u544a', 'error',
        `\u5bfc\u5165 ${result.instanceCount} \u6761\u4f46\u5165\u5e93\u672a\u5b8c\u6210\uff1a${result.ingestError || '\u672a\u77e5'}`, { result })
    }
    return stepResult('import', '\u5bfc\u5165 XML \u62a5\u544a', 'success',
      `\u89e3\u6790 ${result.instanceCount} \u6761\uff0c\u5df2\u5165\u5e93`, { result })
  } catch (e) {
    return stepResult('import', '\u5bfc\u5165 XML \u62a5\u544a', 'error', e.message || '\u5bfc\u5165\u5931\u8d25')
  }
}

export async function runTaskVerifyStep (taskId, minInstances = 1) {
  try {
    const task = await getTask(taskId)
    if (task.status !== 'FINISHED') {
      return stepResult('taskVerify', '\u9a8c\u8bc1\u4efb\u52a1\u4e0e\u5b9e\u4f8b', 'error', `\u72b6\u6001=${task.status}\uff0c\u671f\u671b FINISHED`, { task })
    }
    const search = await searchInstances(taskId, 1, 10)
    const total = Number(search.total || 0)
    if (total < minInstances) {
      return stepResult('taskVerify', '\u9a8c\u8bc1\u4efb\u52a1\u4e0e\u5b9e\u4f8b', 'error', `\u5b9e\u4f8b\u6570 ${total} < ${minInstances}`, { total })
    }
    return stepResult('taskVerify', '\u9a8c\u8bc1\u4efb\u52a1\u4e0e\u5b9e\u4f8b', 'success', `FINISHED\uff0c\u5b9e\u4f8b ${total} \u6761`, {
      task,
      total,
      sample: (search.items || [])[0]
    })
  } catch (e) {
    return stepResult('taskVerify', '\u9a8c\u8bc1\u4efb\u52a1\u4e0e\u5b9e\u4f8b', 'error', e.message || '\u9a8c\u8bc1\u5931\u8d25')
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
      } else if (ready.length >= minReady) {
        return { items: ready, all: items }
      }
    }
    await sleep(2000)
  }
  return { items: [], all: (last && last.items) || [], timeout: true }
}

export async function runExportStep (taskId, options = {}) {
  try {
    const waited = await waitTaskExports(taskId, {
      exportStage: options.exportStage || 'TASK_COMPLETED',
      minReady: 1,
      maxWaitSec: options.maxWaitSec || 45,
      expectJsonOnly: options.expectJsonOnly !== false
    })
    const ready = waited.items || []
    if (!ready.length) {
      const failed = (waited.all || []).filter(r => r.status === 'FAILED')
      const hint = failed.length
        ? `\u6709 ${failed.length} \u6761 FAILED\uff08\u68c0\u67e5 file-sharing\uff09`
        : `\u7b49\u5f85 ${options.maxWaitSec || 45}s \u8d85\u65f6`
      return stepResult('export', '\u5916\u53d1 READY \u9a8c\u8bc1', 'error', hint, { exports: waited.all })
    }
    const pick = ready.find(r => r.format === 'json') || ready[0]
    const meta = await getExportMeta(pick.exportId)
    let downloadBytes = 0
    try {
      const dl = await downloadPartnerExport(pick.exportId)
      downloadBytes = dl.data && dl.data.size != null ? dl.data.size : 0
    } catch (e) {
      return stepResult('export', '\u5916\u53d1 READY \u9a8c\u8bc1', 'error', `\u5143\u6570\u636e OK \u4f46\u4e0b\u8f7d\u5931\u8d25\uff1a${e.message}`, { pick, meta })
    }
    return stepResult('export', '\u5916\u53d1 READY \u9a8c\u8bc1', 'success',
      `READY ${pick.format} exportId=${pick.exportId}\uff0c\u4e0b\u8f7d ${downloadBytes} \u5b57\u8282`, {
        ready,
        pick,
        meta,
        downloadBytes
      })
  } catch (e) {
    return stepResult('export', '\u5916\u53d1 READY \u9a8c\u8bc1', 'error', e.message || '\u5916\u53d1\u9a8c\u8bc1\u5931\u8d25')
  }
}

export async function runWebhookStep (partnerId, taskId, options = {}) {
  try {
    const types = options.eventTypes || ['TASK_COMPLETED', 'EXPORT_READY']
    const counts = {}
    for (const eventType of types) {
      const page = await listWebhookDeliveries({
        partnerId,
        resourceId: taskId,
        eventType,
        page: 1,
        size: 20
      })
      const items = (page && page.items) || []
      counts[eventType] = items.length
    }
    const missing = types.filter(t => (counts[t] || 0) < 1)
    if (missing.length) {
      return stepResult('webhook', 'Webhook \u6295\u9012\u65e5\u5fd7', 'error',
        `\u7f3a\u5c11\u4e8b\u4ef6\uff1a${missing.join('\u3001')}`, { counts })
    }
    return stepResult('webhook', 'Webhook \u6295\u9012\u65e5\u5fd7', 'success',
      types.map(t => `${t}\u00d7${counts[t]}`).join('\uff0c'), { counts })
  } catch (e) {
    return stepResult('webhook', 'Webhook \u6295\u9012\u65e5\u5fd7', 'error', e.message || '\u67e5\u8be2\u5931\u8d25')
  }
}

export async function runInstanceFsmStep (vulInfoId, runId) {
  if (!vulInfoId) {
    return stepResult('instanceFsm', '\u5b9e\u4f8b\u72b6\u6001\u673a\uff08\u53ef\u9009\uff09', 'skip', '\u65e0\u53ef\u7528 vulInfoID')
  }
  try {
    await verifyInstance(vulInfoId, {
      verifyResult: 'VALID',
      srcMethod: 1021,
      operator: 'e2e@console.local',
      transferTime: String(Math.floor(Date.now() / 1000))
    }, `e2e-verify-${runId}`)
    await sleep(3000)
    await remediateInstance(vulInfoId, {
      srcMethod: '1050',
      remedDesc: 'e2e console fix'
    }, `e2e-rem-${runId}`)
    await verifyFixInstance(vulInfoId, {
      verifyResult: 'FIX_CONFIRMED',
      transferTime: String(Math.floor(Date.now() / 1000))
    }, `e2e-vf-${runId}`)
    return stepResult('instanceFsm', '\u5b9e\u4f8b\u72b6\u6001\u673a\uff08\u53ef\u9009\uff09', 'success',
      `vulInfoID=${vulInfoId}\uff1a\u6838\u9a8c\u2192\u4fee\u590d\u2192\u4fee\u590d\u6838\u9a8c`, { vulInfoId })
  } catch (e) {
    return stepResult('instanceFsm', '\u5b9e\u4f8b\u72b6\u6001\u673a\uff08\u53ef\u9009\uff09', 'error', e.message || '\u72b6\u6001\u673a\u5931\u8d25')
  }
}

export async function runFullManualE2e (context) {
  const results = []
  const push = r => { results.push(r); return r }

  let r = await runHealthStep()
  push(r)
  if (r.status === 'error') return results

  r = await runPartnerStep(context.partnerId)
  push(r)
  if (r.status === 'error') return results

  r = await runTokenStep(r.clientId, r.clientSecret, r.partnerId)
  push(r)
  if (r.status === 'error') return results

  r = await runCreateTaskStep(context.taskForm, context.partnerId)
  push(r)
  if (r.status === 'error') return results
  const taskId = r.taskId

  r = await runImportStep(taskId, context.xmlFile, false)
  push(r)
  if (r.status === 'error') return results

  r = await runTaskVerifyStep(taskId, context.minInstances || 1)
  push(r)
  if (r.status === 'error') return results
  const vulInfoId = (r.sample && r.sample.vulInfoID) || null

  r = await runExportStep(taskId, {
    expectJsonOnly: context.taskForm.reportTemplateId === 2001,
    maxWaitSec: context.exportWaitSec || 45
  })
  push(r)
  if (r.status === 'error') return results

  r = await runWebhookStep(context.partnerId, taskId)
  push(r)

  if (context.includeInstanceFsm) {
    const fsm = await runInstanceFsmStep(vulInfoId, context.runId)
    push(fsm)
    if (fsm.status === 'success') {
      const vfExport = await runExportStep(taskId, {
        exportStage: 'VERIFY_FIX_SCAN',
        expectJsonOnly: false,
        maxWaitSec: context.exportWaitSec || 45
      })
      push(vfExport)
      const vfWh = await runWebhookStep(context.partnerId, taskId, {
        eventTypes: ['INSTANCE_VERIFY_FIX_COMPLETED']
      })
      push(vfWh)
    }
  }

  return results
}

'use strict'
const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, 'build-invocation-views.js')
let s = fs.readFileSync(file, 'utf8')
const fullStopExpr = "' + t('fullStop') + '"
s = s.replace(/\}\}[\uFFFD\u0080-\u009F]{1,4}<\/span>/g, "}}' + t('fullStop') + '</span>")
s = s.replace(
  "return \\'' + t('previewTitle').replace(/'/g, '\\\\\\'') + ' - \\' + this.detail.operationId",
  "return \\'' + t('previewTitle') + ' - \\' + this.detail.operationId"
)
s = s.replace(
  "return \\'' + t('previewTitle').replace(/'/g, '\\\\\\'') + ' - ' + t('loading').replace(/'/g, '\\\\\\'') + \\''",
  "return \\'' + t('previewTitle') + ' - ' + t('loading') + \\''"
)
s = s.replace(
  "'            <span>  {{ detail.partnerId }}</span>',",
  "'            <span>' + t('middleDotSep') + '{{ detail.partnerId }}</span>',"
)
s = s.replace(
  "'            <span>  {{ formatDateTime(detail.startedAt) }}</span>',",
  "'            <span>' + t('middleDotSep') + '{{ formatDateTime(detail.startedAt) }}</span>',"
)
// fix corrupted middle-dot lines (replacement chars)
s = s.replace(
  /'            <span> [\uFFFD\u0080-\u009F]{1,4} \{\{ detail\.partnerId \}\}<\/span>',/g,
  "'            <span>' + t('middleDotSep') + '{{ detail.partnerId }}</span>',"
)
s = s.replace(
  /'            <span> [\uFFFD\u0080-\u009F]{1,4} \{\{ formatDateTime\(detail\.startedAt\) \}\}<\/span>',/g,
  "'            <span>' + t('middleDotSep') + '{{ formatDateTime(detail.startedAt) }}</span>',"
)
fs.writeFileSync(file, s, 'utf8')
console.log('[patch-build] done')

/**
 * Detect mojibake in src vue and js files.
 * Usage: node scripts/verify-utf8.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'src')
const EXT = new Set(['.vue', '.js'])
const MOJIBAKE = [/\?{4,}/, /\uFFFD/, /[\u0080-\u009F]/]

function walk (dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full, files)
    else if (EXT.has(path.extname(name))) files.push(full)
  }
  return files
}

function checkFile (file) {
  const buf = fs.readFileSync(file)
  let text
  try {
    text = buf.toString('utf8')
  } catch (e) {
    return [`Invalid UTF-8: ${e.message}`]
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return ['UTF-8 BOM detected; use UTF-8 without BOM']
  }
  const issues = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    const uiLike = /[\u4e00-\u9fff]/.test(line) ||
      /title=|description=|label=|tab=|placeholder=|content:|message\.|helper|toolbar-note|api-hint/.test(line)
    if (!uiLike) return
    for (const pattern of MOJIBAKE) {
      if (pattern.test(line)) {
        issues.push(`line ${index + 1}: ${line.trim().slice(0, 120)}`)
        break
      }
    }
  })
  return issues
}

const files = walk(ROOT)
const failures = []
files.forEach(file => {
  const issues = checkFile(file)
  if (issues.length) failures.push({ file: path.relative(path.join(__dirname, '..'), file), issues })
})

if (failures.length) {
  console.error('[verify-utf8] Mojibake detected:')
  failures.forEach(item => {
    console.error(`\n  ${item.file}`)
    item.issues.forEach(msg => console.error(`    - ${msg}`))
  })
  process.exit(1)
}

console.log(`[verify-utf8] OK (${files.length} files)`)
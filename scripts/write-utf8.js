/**
 * Write UTF-8 (no BOM) text to a file. Safe for Chinese UI on Windows.
 *
 * Usage:
 *   node scripts/write-utf8.js <relative-or-absolute-path>
 *   (stdin = file content, UTF-8)
 *
 * Agent: never use editor Write/StrReplace for Chinese in .vue/.js;
 *        pipe content into this script instead.
 */
const fs = require('fs')
const path = require('path')

const target = process.argv[2]
if (!target) {
  console.error('Usage: node scripts/write-utf8.js <path>')
  process.exit(1)
}

const root = path.join(__dirname, '..')
const fullPath = path.isAbsolute(target) ? target : path.join(root, target)
const content = fs.readFileSync(0, 'utf8')

if (content.charCodeAt(0) === 0xfeff) {
  console.error('[write-utf8] Refusing BOM in stdin content')
  process.exit(1)
}

fs.writeFileSync(fullPath, content, { encoding: 'utf8' })
console.log(`[write-utf8] OK ${path.relative(root, fullPath)} (${Buffer.byteLength(content, 'utf8')} bytes)`)

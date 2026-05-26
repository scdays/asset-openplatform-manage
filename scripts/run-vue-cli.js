/**
 * 按当前 Node 能力启动 vue-cli-service。
 * - Node 17–22 + OpenSSL3：需要 --openssl-legacy-provider（webpack4）
 * - Node 16 或已移除该参数的版本：不加该参数
 */
const { spawnSync } = require('child_process')
const path = require('path')

const cliArgs = process.argv.slice(2)
const serviceBin = path.resolve(__dirname, '../node_modules/@vue/cli-service/bin/vue-cli-service.js')

function supportsOpenSslLegacyProvider () {
  const probe = spawnSync(process.execPath, ['--openssl-legacy-provider', '-e', 'process.exit(0)'], {
    stdio: 'ignore'
  })
  return probe.status === 0
}

const nodeArgs = []
if (supportsOpenSslLegacyProvider()) {
  nodeArgs.push('--openssl-legacy-provider')
}
nodeArgs.push(serviceBin, ...cliArgs)

const result = spawnSync(process.execPath, nodeArgs, { stdio: 'inherit' })
const code = result.status
process.exit(code === null ? 1 : code)

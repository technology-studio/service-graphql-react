module.exports = (async function config() {
  const txoPackageConfigList = await import('eslint-config-txo-package-react')
  return txoPackageConfigList.configList
})()

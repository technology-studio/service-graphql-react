const txoConfig = require('eslint-config-txo-typescript-react')

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  ...txoConfig.default,
]

module.exports = config

/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-09-28T20:09:40+02:00
 * @Copyright: Technology Studio
**/

import {
  DocumentNode,
  OperationDefinitionNode,
} from 'graphql'

const upperCaseFirst = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1)
const pascalCase = (string: string): string => (
  `${string}`
    .replace(/[-_]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(
      /\s+(.)(\w*)/g,
      (_$1, $2: string, $3: string) => `${$2.toUpperCase() + $3.toLowerCase()}`,
    )
    .replace(/\w/, s => s.toUpperCase())
)

export const getName = (query: DocumentNode): string => {
  const definition = query.definitions
    .find(definition => (
      definition.kind === 'OperationDefinition'
    )) as OperationDefinitionNode
  const operationName = definition?.name?.value
    .split('_')
    .map(pascalCase)
    .join('.')
  return operationName ?? upperCaseFirst(definition.operation)
}

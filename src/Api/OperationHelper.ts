/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-09-28T20:09:40+02:00
 * @Copyright: Technology Studio
**/

import { is } from '@txo/types'
import {
  type DefinitionNode,
  Kind,
  type DocumentNode,
  type OperationDefinitionNode,
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

const isOperationDefinitionNode = (node: DefinitionNode): node is OperationDefinitionNode => (
  node?.kind === Kind.OPERATION_DEFINITION
)

export const getName = (query: DocumentNode): string => {
  const definition = query.definitions
    .find(isOperationDefinitionNode)
  const operationName = definition?.name?.value
    .split('_')
    .map(pascalCase)
    .join('.')
  return operationName ?? upperCaseFirst(is(definition).operation)
}

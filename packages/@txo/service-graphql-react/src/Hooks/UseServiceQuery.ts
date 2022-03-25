/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-09-01T16:09:57+02:00
 * @Copyright: Technology Studio
**/

import {
  useContext,
  useLayoutEffect,
  useMemo,
} from 'react'
import {
  DocumentNode,
  QueryHookOptions,
  TypedDocumentNode,
  QueryResult,
  useQuery,
} from '@apollo/client'
import get from 'lodash.get'
import type { Get } from 'type-fest'
import {
  CallAttributes,
  ServiceErrorException,
  ServiceProp,
} from '@txo/service-prop'
import { configManager } from '@txo-peer-dep/service-graphql'
import {
  useMemoObject,
} from '@txo/hooks-react'
import { serviceContext } from '@txo/service-react'
import { ErrorHandlerContext } from '@txo-peer-dep/service-error-handler-react'

import { getName } from '../Api/OperationHelper'
import { Typify } from '@txo/types'

const calculateContext = (query: DocumentNode, variables: Record<string, unknown> | undefined): string => (
  serviceContext(getName(query), variables ?? {})
)

export type QueryServiceProp<ATTRIBUTES, DATA, MAPPED_DATA, CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>> =
  Omit<ServiceProp<ATTRIBUTES, MAPPED_DATA, CALL_ATTRIBUTES>, 'call' | 'clear' | 'options' | 'clearException'>
  & {
    query: QueryResult<DATA, ATTRIBUTES>,
  }

type QueryOptions<DATA, ATTRIBUTES, DATA_PATH extends string> = {
  options: QueryHookOptions<DATA, ATTRIBUTES>,
  dataPath: DATA_PATH,
}

// TODO: find a better way to parse type of dataPath (from attribute)
export const useServiceQuery = <ATTRIBUTES extends Record<string, unknown>, DATA, CALL_ATTRIBUTES, DATA_PATH extends string>(
  queryDocument: TypedDocumentNode<DATA, ATTRIBUTES>,
  options: QueryOptions<DATA, ATTRIBUTES, DATA_PATH>,
): QueryServiceProp<ATTRIBUTES, DATA, Get<DATA, DATA_PATH>, CALL_ATTRIBUTES> => {
  const {
    dataPath,
    options: queryOptions,
  } = options
  const query: QueryResult<DATA, ATTRIBUTES> = useQuery<DATA, ATTRIBUTES>(queryDocument, queryOptions)
  const {
    addServiceErrorException,
    removeServiceErrorException,
  } = useContext(ErrorHandlerContext)
  const memoizedVariables = useMemoObject(queryOptions?.variables)
  const memoizedQuery = useMemoObject<Typify<QueryResult<DATA, ATTRIBUTES>>>(query)
  const context = useMemo(() => (
    calculateContext(queryDocument, memoizedVariables)
  ), [queryDocument, memoizedVariables])
  const exception = useMemo(() => {
    const operationName = getName(queryDocument)
    const errorList = configManager.config.errorResponseTranslator(memoizedQuery, {
      context,
      operationName,
    })
    const exception = new ServiceErrorException({
      serviceErrorList: errorList,
      serviceName: operationName,
      context,
    })
    return errorList.length === 0 ? null : exception
  }, [context, memoizedQuery, queryDocument])
  useLayoutEffect(() => {
    exception && addServiceErrorException(exception)
    return () => {
      exception && removeServiceErrorException(context)
    }
  }, [addServiceErrorException, context, exception, memoizedVariables, queryDocument, removeServiceErrorException])

  return useMemo(() => ({
    query: memoizedQuery,
    data: get(memoizedQuery.data, dataPath),
    fetching: memoizedQuery.loading,
    exception,
  }), [memoizedQuery, exception, dataPath])
}

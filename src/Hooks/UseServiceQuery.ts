/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-09-01T16:09:57+02:00
 * @Copyright: Technology Studio
**/

import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  DocumentNode,
  QueryHookOptions,
  TypedDocumentNode,
  QueryResult,
  OperationVariables,
  ApolloError,
} from '@apollo/client'
import {
  useQuery,
} from '@apollo/client'
import get from 'lodash.get'
import type { Get } from 'type-fest'
import type {
  CallAttributes,
  ServiceProp,
} from '@txo/service-prop'
import {
  ServiceOperationError,
} from '@txo/service-prop'
import { configManager } from '@txo-peer-dep/service-graphql'
import {
  useMemoObject,
} from '@txo/hooks-react'
import { reportError } from '@txo-peer-dep/error-handler'
import type { Typify } from '@txo/types'

import { serviceContext } from '../Api/ContextHelper'
import { getName } from '../Api/OperationHelper'
import { asyncToCallback } from '../Api/PromiseHelper'
import { ObservableContext } from '../Api/ObservableContext'

const calculateContext = (query: DocumentNode, variables: Record<string, unknown> | undefined): string => (
  serviceContext(getName(query), variables ?? {})
)

export type QueryServiceProp<ATTRIBUTES extends OperationVariables, DATA, MAPPED_DATA, CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>> =
  Omit<ServiceProp<ATTRIBUTES, MAPPED_DATA, CALL_ATTRIBUTES>, 'call' | 'options'>
  & {
    query: QueryResult<DATA, ATTRIBUTES>,
    promiselessRefetch: (variables?: Partial<ATTRIBUTES>) => void,
    fetchMore: QueryResult<DATA, ATTRIBUTES>['fetchMore'],
    fetchMoreIsFetching: boolean,
  }

type QueryOptions<DATA, ATTRIBUTES extends OperationVariables, DATA_PATH extends string> = {
  options?: QueryHookOptions<DATA, ATTRIBUTES>,
  dataPath: DATA_PATH,
}

// TODO: find a better way to parse type of dataPath (from attribute)
export const useServiceQuery = <
  ATTRIBUTES extends Record<string, unknown>,
  DATA,
  CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>,
  DATA_PATH extends string
> (
  queryDocument: TypedDocumentNode<DATA, ATTRIBUTES>,
  options: QueryOptions<DATA, ATTRIBUTES, DATA_PATH>,
): QueryServiceProp<ATTRIBUTES, DATA, Get<DATA, DATA_PATH>, CALL_ATTRIBUTES> => {
  const {
    dataPath,
    options: _queryOptions,
  } = options

  const observable = useContext(ObservableContext)
  const isSkipped = ((_queryOptions?.skip) ?? false) || !observable
  const queryOptions = useMemoObject({
    ..._queryOptions,
    skip: isSkipped,
  })
  const query: QueryResult<DATA, ATTRIBUTES> = useQuery<DATA, ATTRIBUTES>(queryDocument, queryOptions)
  const reportedOperationErrorListRef = useRef<(ServiceOperationError)[]>([])
  const [fetchMoreIsFetching, setFetchMoreFetching] = useState(false)
  const memoizedVariables = useMemoObject(queryOptions?.variables)
  const memoizedQuery = useMemoObject<Typify<QueryResult<DATA, ATTRIBUTES>>>(query)
  useMemo(() => {
    reportedOperationErrorListRef.current = []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedQuery, queryDocument])
  const recentData = useRef(memoizedQuery.data)
  if (!isSkipped) {
    recentData.current = memoizedQuery.data
  }
  const data: DATA | null = recentData.current ?? null
  const context = useMemo(() => (
    calculateContext(queryDocument, memoizedVariables)
  ), [queryDocument, memoizedVariables])
  const error = useMemo(() => {
    const operationName = getName(queryDocument)
    if (memoizedQuery.error != null) {
      const serviceErrorList = configManager.config.errorResponseTranslator(memoizedQuery.error, {
        context,
        operationName,
      })
      const serviceOperationError = new ServiceOperationError({
        serviceErrorList,
        operationName,
        context,
      })
      return serviceOperationError
    }
    return null
  }, [context, memoizedQuery.error, queryDocument])
  useLayoutEffect(() => {
    if ((error != null) && !reportedOperationErrorListRef.current.includes(error)) {
      reportError(error)
      reportedOperationErrorListRef.current.push(error)
    }
  }, [context, error, memoizedVariables, queryDocument])

  const promiselessRefetch = useCallback((...args: Parameters<typeof memoizedQuery.refetch>) => {
    reportedOperationErrorListRef.current = []
    asyncToCallback(memoizedQuery.refetch(...args))
  }, [memoizedQuery])

  const fetchMore: QueryResult<DATA>['fetchMore'] = useCallback(async (...args) => {
    reportedOperationErrorListRef.current = []
    setFetchMoreFetching(true)
    return (
      await memoizedQuery.fetchMore(...args)
        .catch((error: ApolloError) => {
          const operationName = getName(queryDocument)
          const errorList = configManager.config.errorResponseTranslator(error, {
            context,
            operationName,
          })
          const serviceOperationError = new ServiceOperationError({
            serviceErrorList: errorList,
            operationName,
            context,
          })
          throw serviceOperationError
        })
        .finally(() => {
          setFetchMoreFetching(false)
        })
    )
  }, [context, memoizedQuery, queryDocument])

  return useMemo(() => ({
    query: memoizedQuery,
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    data: get(data, dataPath) as Get<DATA, DATA_PATH> | null,
    isFetching: memoizedQuery.loading,
    fetchMoreIsFetching,
    promiselessRefetch,
    fetchMore,
    error,
  }), [memoizedQuery, data, dataPath, fetchMoreIsFetching, promiselessRefetch, fetchMore, error])
}

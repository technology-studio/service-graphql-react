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
  ServiceError,
  ServiceProp,
} from '@txo/service-prop'
import {
  ServiceErrorException,
} from '@txo/service-prop'
import { configManager } from '@txo-peer-dep/service-graphql'
import {
  useMemoObject,
} from '@txo/hooks-react'
import { ErrorHandlerContext } from '@txo-peer-dep/service-error-handler-react'
import type { Typify } from '@txo/types'

import { serviceContext } from '../Api/ContextHelper'
import { getName } from '../Api/OperationHelper'
import { asyncToCallback } from '../Api/PromiseHelper'
import { ObservableContext } from '../Api/ObservableContext'

const calculateContext = (query: DocumentNode, variables: Record<string, unknown> | undefined): string => (
  serviceContext(getName(query), variables ?? {})
)

export type QueryServiceProp<ATTRIBUTES extends OperationVariables, DATA, MAPPED_DATA, CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>> =
  Omit<ServiceProp<ATTRIBUTES, MAPPED_DATA, CALL_ATTRIBUTES>, 'call' | 'clear' | 'options' | 'clearException'>
  & {
    query: QueryResult<DATA, ATTRIBUTES>,
    promiselessRefetch: (variables?: Partial<ATTRIBUTES>) => void,
    fetchMore: QueryResult<DATA, ATTRIBUTES>['fetchMore'],
    fetchMoreFetching: boolean,
  }

type QueryOptions<DATA, ATTRIBUTES extends OperationVariables, DATA_PATH extends string> = {
  options?: QueryHookOptions<DATA, ATTRIBUTES>,
  dataPath: DATA_PATH,
}

const isServiceErrorListEqual = (a: ServiceError[], b: ServiceError[]): boolean => {
  if (a.length !== b.length) {
    return false
  }
  if (a.every((error, index) => (b[index].key === error.key) && (b[index].message === error.message))) {
    return true
  }
  return false
}

// TODO: find a better way to parse type of dataPath (from attribute)
export const useServiceQuery = <
  ATTRIBUTES extends Record<string, unknown>,
  DATA,
  CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>,
  DATA_PATH extends string
>(
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
  const shownExceptionListRef = useRef<(ServiceErrorException)[]>([])
  const {
    addServiceErrorException,
    removeServiceErrorException,
  } = useContext(ErrorHandlerContext)
  const [fetchMoreFetching, setFetchMoreFetching] = useState(false)
  const memoizedVariables = useMemoObject(queryOptions?.variables)
  const memoizedQuery = useMemoObject<Typify<QueryResult<DATA, ATTRIBUTES>>>(query)
  const recentData = useRef(memoizedQuery.data)
  if (!isSkipped) {
    recentData.current = memoizedQuery.data
  }
  const data: DATA | null = recentData.current ?? null
  const context = useMemo(() => (
    calculateContext(queryDocument, memoizedVariables)
  ), [queryDocument, memoizedVariables])
  const exception = useMemo(() => {
    const operationName = getName(queryDocument)
    if (memoizedQuery.error != null) {
      const errorList = configManager.config.errorResponseTranslator(memoizedQuery.error, {
        context,
        operationName,
      })
      const exception = new ServiceErrorException({
        serviceErrorList: errorList,
        serviceName: operationName,
        context,
      })
      return exception
    }
    return null
  }, [context, memoizedQuery, queryDocument])
  useLayoutEffect(() => {
    if ((exception != null) && (shownExceptionListRef.current.find(shownException => (
      isServiceErrorListEqual(shownException.serviceErrorList, exception.serviceErrorList)
    )) == null)) {
      addServiceErrorException(exception)
      shownExceptionListRef.current.push(exception)
    }
    return () => {
      (exception != null) && removeServiceErrorException(context)
    }
  }, [addServiceErrorException, context, exception, memoizedVariables, queryDocument, removeServiceErrorException])

  const promiselessRefetch = useCallback((...args: Parameters<typeof memoizedQuery.refetch>) => {
    asyncToCallback(memoizedQuery.refetch(...args))
  }, [memoizedQuery])

  const fetchMore: QueryResult<DATA>['fetchMore'] = useCallback(async (...args) => {
    setFetchMoreFetching(true)
    return (
      await memoizedQuery.fetchMore(...args)
        .catch((error: ApolloError) => {
          const operationName = getName(queryDocument)
          const errorList = configManager.config.errorResponseTranslator(error, {
            context,
            operationName,
          })
          const exception = new ServiceErrorException({
            serviceErrorList: errorList,
            serviceName: operationName,
            context,
          })
          addServiceErrorException(exception)
          throw error
        })
        .finally(() => {
          setFetchMoreFetching(false)
        })
    )
  }, [addServiceErrorException, context, memoizedQuery, queryDocument, setFetchMoreFetching])

  return useMemo(() => ({
    query: memoizedQuery,
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    data: get(data, dataPath) as Get<DATA, DATA_PATH> | null,
    fetching: memoizedQuery.loading,
    fetchMoreFetching,
    promiselessRefetch,
    fetchMore,
    exception,
  }), [memoizedQuery, data, dataPath, fetchMoreFetching, promiselessRefetch, fetchMore, exception])
}

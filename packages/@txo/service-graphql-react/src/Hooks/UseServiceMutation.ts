/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-08-24T13:08:91+02:00
 * @Copyright: Technology Studio
**/

import {
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react'
import {
  serviceContext,
} from '@txo/service-react'
import {
  CallAttributes,
  ServiceProp,
  ServiceErrorException,
  ServicePropCall,
} from '@txo/service-prop'
import { useMemoObject } from '@txo/hooks-react'
import type { Typify } from '@txo/types'
import {
  DocumentNode,
  MutationOptions as ApolloMutationOptions,
  TypedDocumentNode,
  MutationResult,
  useMutation,
} from '@apollo/client'
import { ErrorHandlerContext } from '@txo-peer-dep/service-error-handler-react'
import { operationPromiseProcessor } from '@txo/service-graphql'

import { getName } from '../Api/OperationHelper'
import { ErrorMap } from '../Model/Types'
import { applyErrorMap } from '../Api/ErrorMapHelper'

const calculateContext = (mutation: DocumentNode, variables?: Record<string, unknown>): string => (
  serviceContext(getName(mutation), variables ?? {})
)

export type MutationServiceProp<ATTRIBUTES, DATA, CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>> =
  Omit<ServiceProp<ATTRIBUTES, DATA, CALL_ATTRIBUTES>, 'clear' | 'options' | 'clearException' | 'exception'>
  & {
    mutation: MutationResult<DATA>,
  }

type MutationOptions<DATA, ATTRIBUTES> = {
  options?: Omit<ApolloMutationOptions<DATA, ATTRIBUTES>, 'mutation'>,
  errorMap?: ErrorMap,
}

export const useServiceMutation = <
  ATTRIBUTES extends Record<string, unknown>,
  DATA,
  CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>,
>(
    mutationDocument: TypedDocumentNode<DATA, ATTRIBUTES>,
    options?: MutationOptions<DATA, ATTRIBUTES>,
  ): MutationServiceProp<ATTRIBUTES, DATA, CALL_ATTRIBUTES> => {
  const {
    errorMap,
    options: mutationOptions,
  } = options ?? {}
  const exceptionRef = useRef<ServiceErrorException | null>(null)
  const [mutate, mutation] = useMutation<
  DATA,
  ATTRIBUTES
  >(mutationDocument, mutationOptions)
  const {
    addServiceErrorException,
    removeServiceErrorException,
  } = useContext(ErrorHandlerContext)
  const memoizedOptions = useMemoObject(mutationOptions as Omit<ApolloMutationOptions<DATA, ATTRIBUTES>, 'mutation'>)
  const wrappedCall = useCallback(async (
    variables: ATTRIBUTES,
  ) => {
    const attributes = { variables, mutation: mutationDocument, ...memoizedOptions }
    const context = calculateContext(mutationDocument, variables)
    exceptionRef.current && removeServiceErrorException(context)
    exceptionRef.current = null
    const operationName = getName(mutationDocument)
    return operationPromiseProcessor(mutate(attributes), {
      operationName,
      context,
    })
      .catch(async (serviceErrorException: ServiceErrorException) => {
        if (errorMap) {
          applyErrorMap(serviceErrorException, errorMap)
        }
        addServiceErrorException(serviceErrorException)
        exceptionRef.current = serviceErrorException
        throw serviceErrorException
      })
  }, [memoizedOptions, mutationDocument, removeServiceErrorException, mutate, addServiceErrorException])

  const memoizedMutation = useMemoObject<Typify<MutationResult<DATA>>>(mutation)

  return useMemo(() => ({
    mutation: memoizedMutation,
    data: memoizedMutation.data ?? null,
    fetching: memoizedMutation.loading,
    call: wrappedCall as unknown as ServicePropCall<ATTRIBUTES, DATA, CALL_ATTRIBUTES>,
  }), [memoizedMutation, wrappedCall])
}

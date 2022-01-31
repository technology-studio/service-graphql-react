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
import {
  DocumentNode,
  MutationOptions,
  TypedDocumentNode,
  MutationResult,
  useMutation,
} from '@apollo/client'
import { ErrorHandlerContext } from '@txo-peer-dep/service-error-handler-react'
import { operationPromiseProcessor } from '@txo/service-graphql'

import { getName } from '../Api/OperationHelper'

const calculateContext = (mutation: DocumentNode, variables?: Record<string, unknown>): string => (
  serviceContext(getName(mutation), variables ?? {})
)

export type MutationServiceProp<ATTRIBUTES, DATA, CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>> =
  Omit<ServiceProp<ATTRIBUTES, DATA, CALL_ATTRIBUTES>, 'clear' | 'options' | 'clearException' | 'exception'>
  & {
    mutation: MutationResult<DATA>,
  }

export const useServiceMutation = <
  ATTRIBUTES extends Record<string, unknown>,
  DATA,
  CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>,
>(
    mutationDocument: TypedDocumentNode<DATA, ATTRIBUTES>,
    options?: Omit<MutationOptions<DATA, ATTRIBUTES>, 'mutation'>,
  ): MutationServiceProp<ATTRIBUTES, DATA, CALL_ATTRIBUTES> => {
  const exceptionRef = useRef<ServiceErrorException | null>(null)
  const [mutate, mutation] = useMutation<
  DATA,
  ATTRIBUTES
  >(mutationDocument, options)
  const {
    addServiceErrorException,
    removeServiceErrorException,
  } = useContext(ErrorHandlerContext)
  const memoizedOptions = useMemoObject(options)
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
        addServiceErrorException(serviceErrorException)
        exceptionRef.current = serviceErrorException
        throw serviceErrorException
      })
  }, [memoizedOptions, mutationDocument, removeServiceErrorException, mutate, addServiceErrorException])

  return useMemo(() => ({
    data: mutation.data ?? null,
    fetching: mutation.loading,
    call: wrappedCall as unknown as ServicePropCall<ATTRIBUTES, DATA, CALL_ATTRIBUTES>,
    mutation,
  }), [mutation, wrappedCall])
}

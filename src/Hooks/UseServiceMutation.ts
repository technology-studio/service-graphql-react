/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-08-24T13:08:91+02:00
 * @Copyright: Technology Studio
**/

import type { DependencyList } from 'react'
import {
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react'
import type {
  CallAttributes,
  ServiceProp,
  ServiceErrorException,
} from '@txo/service-prop'
import { useMemoObject } from '@txo/hooks-react'
import type { Typify } from '@txo/types'
import type {
  DocumentNode,
  MutationOptions as ApolloMutationOptions,
  TypedDocumentNode,
  MutationResult,
  MutationFunctionOptions as MutateFunctionOptions,
  FetchResult,
} from '@apollo/client'
import {
  useMutation,
} from '@apollo/client'
import { ErrorHandlerContext } from '@txo-peer-dep/service-error-handler-react'
import { operationPromiseProcessor } from '@txo/service-graphql'

import { serviceContext } from '../Api/ContextHelper'
import { getName } from '../Api/OperationHelper'
import type { ErrorMap } from '../Model/Types'
import { applyErrorMap } from '../Api/ErrorMapHelper'

const calculateContext = (mutation: DocumentNode, variables?: Record<string, unknown>): string => (
  serviceContext(getName(mutation), variables ?? {})
)

export type MutationServiceProp<ATTRIBUTES, DATA, CALL_ATTRIBUTES extends CallAttributes<ATTRIBUTES>> =
  Omit<ServiceProp<ATTRIBUTES, DATA, CALL_ATTRIBUTES, FetchResult<DATA>>, 'clear' | 'options' | 'clearException' | 'exception'>
  & {
    mutation: MutationResult<DATA>,
  }

export type MutateFunction<DATA, ATTRIBUTES> = (options?: MutateFunctionOptions<DATA, ATTRIBUTES>) => Promise<FetchResult<DATA>>

export type MutationOptions<DATA, ATTRIBUTES> = {
  onFieldErrors?: (fieldErrors: Record<string, Record<string, string>>) => void,
  options?: Omit<ApolloMutationOptions<DATA, ATTRIBUTES>, 'mutation'>,
  errorMap?: ErrorMap,
  mutateFactory?: (mutate: MutateFunction<DATA, ATTRIBUTES>) => MutateFunction<DATA, ATTRIBUTES>,
  onFieldErrorsDependencyList?: DependencyList,
  errorMapDependencyList?: DependencyList,
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
    onFieldErrors: defaultOnFieldErrors,
    onFieldErrorsDependencyList,
    errorMap,
    errorMapDependencyList,
    options: mutationOptions,
    mutateFactory,
  } = options ?? {}
  const exceptionRef = useRef<ServiceErrorException | null>(null)
  const memoizedErrorMap = useMemo(
    () => errorMap,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    errorMapDependencyList ?? [],
  )
  const memoizedDefaultOnFieldErrors = useMemo(
    () => defaultOnFieldErrors,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    onFieldErrorsDependencyList ?? [],
  )
  const [mutate, mutation] = useMutation<
  DATA,
  ATTRIBUTES
  >(mutationDocument, mutationOptions)
  const {
    addServiceErrorException,
    removeServiceErrorException,
  } = useContext(ErrorHandlerContext)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const memoizedOptions = useMemoObject(mutationOptions!)
  const wrappedCall = useCallback(async (
    variables: ATTRIBUTES,
    callAttributes?: CALL_ATTRIBUTES,
  ) => {
    const attributes = { variables, mutation: mutationDocument, ...memoizedOptions }
    const onFieldErrors = callAttributes?.onFieldErrors ?? memoizedDefaultOnFieldErrors
    const context = calculateContext(mutationDocument, variables)
    ;(exceptionRef.current != null) && removeServiceErrorException(context)
    exceptionRef.current = null
    const operationName = getName(mutationDocument)
    const mutateWithErrorProcessor: typeof mutate = async (options) => (
      await operationPromiseProcessor(mutate(options), {
        operationName,
        context,
      })
    )
    const nextMutate = mutateFactory?.(mutateWithErrorProcessor) ?? mutateWithErrorProcessor
    return await operationPromiseProcessor(nextMutate(attributes), {
      operationName,
      context,
    })
      .catch(async (serviceErrorException: ServiceErrorException) => {
        if (memoizedErrorMap != null) {
          serviceErrorException.serviceErrorList = applyErrorMap(
            serviceErrorException.serviceErrorList,
            memoizedErrorMap,
            onFieldErrors,
          )
        }
        addServiceErrorException(serviceErrorException)
        exceptionRef.current = serviceErrorException
        throw serviceErrorException
      })
  }, [mutationDocument, memoizedOptions, memoizedDefaultOnFieldErrors, removeServiceErrorException, mutateFactory, mutate, memoizedErrorMap, addServiceErrorException])

  const memoizedMutation = useMemoObject<Typify<MutationResult<DATA>>>(mutation)

  return useMemo(() => ({
    mutation: memoizedMutation,
    data: memoizedMutation.data ?? null,
    fetching: memoizedMutation.loading,
    call: wrappedCall,
  }), [memoizedMutation, wrappedCall])
}

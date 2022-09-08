/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2022-03-17T14:03:65+01:00
 * @Copyright: Technology Studio
**/

import type {
  ServiceError,
} from '@txo/service-prop'
import { isObject } from '@txo/functional'
import set from 'lodash.set'

import type {
  ErrorMap,
  ErrorMapper,
} from '../Model/Types'
import {
  VALIDATION_ERROR,
} from '../Model/Types'

const normaliseErrorMap = (errorMap: ErrorMap): ErrorMap => {
  if (isObject(errorMap)) {
    return Object.keys(errorMap).reduce((normalisedErrorMap: { [key: string]: ErrorMap }, key) => {
      set(normalisedErrorMap, key, normaliseErrorMap(errorMap[key]))
      return normalisedErrorMap
    }, {})
  }
  return errorMap
}

export const ignoreError = (): ErrorMapper => () => undefined
export const validationError = (message?: string): ErrorMapper => ({
  error,
}) => {
  const nextError: ServiceError = {
    ...error,
    message: message ?? error.message,
    meta: {
      ...error.meta,
      type: VALIDATION_ERROR,
    },
  }

  return nextError
}

const getWithWildcardFallback = (errorMap: ErrorMap, path: string): ErrorMapper | undefined => {
  if (errorMap === undefined) {
    return undefined
  }
  if (path) {
    if (isObject(errorMap)) {
      const pathList = path.split('.')
      const currentPath = pathList.shift()
      const keyList = Object.keys(errorMap)
      const currentKey = currentPath && keyList.includes(currentPath) ? currentPath : '*'
      return getWithWildcardFallback(errorMap[currentKey], pathList.join('.'))
    } else {
      return undefined
    }
  }
  return typeof errorMap === 'function' ? errorMap : undefined
}

export const applyErrorMap = (
  serviceErrorList: ServiceError[],
  errorMap: ErrorMap,
  onFieldErrors?: (fieldErrors: Record<string, Record<string, string>>) => void,
): ServiceError[] => {
  const normalisedErrorMap = normaliseErrorMap(errorMap)
  let modified = false
  const fieldErrors = {}
  const nextServiceErrorList = serviceErrorList
    .reduce<ServiceError[]>(
    (nextServiceErrorList, serviceError) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graphQlError: any = serviceError.data
      const path = [...(graphQlError?.path ?? []), serviceError.key].join('.')
      const errorMapper = getWithWildcardFallback(normalisedErrorMap, path)

      if (errorMapper) {
        const nextServiceError = errorMapper({
          error: serviceError,
          fieldErrors,
          path,
        })
        if (nextServiceError !== serviceError) {
          modified = true
        }
        nextServiceError && nextServiceErrorList.push(nextServiceError)
      } else {
        nextServiceErrorList.push(serviceError)
      }

      return nextServiceErrorList
    }, [])

  if (onFieldErrors && Object.keys(fieldErrors).length > 0) {
    onFieldErrors(fieldErrors)
  }

  return modified ? nextServiceErrorList : serviceErrorList
}

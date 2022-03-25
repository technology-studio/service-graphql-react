/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2022-03-17T14:03:65+01:00
 * @Copyright: Technology Studio
**/

import {
  ServiceError,
  ServiceErrorException,
} from '@txo/service-prop'
import get from 'lodash.get'

import {
  ErrorMap,
  ErrorMapper,
  VALIDATION_ERROR,
} from '../Model/Types'

export const ignoreError = (): ErrorMapper => () => (undefined)
export const validationError = (message?: string): ErrorMapper => ({
  error,
}) => {
  if (message) {
    error.message = message
  }
  error.meta
    ? error.meta.type = VALIDATION_ERROR
    : error.meta = { type: VALIDATION_ERROR }

  return error
}

export const applyErrorMap = (
  serviceErrorException: ServiceErrorException,
  normalisedErrorMap: ErrorMap | ErrorMapper,
  onFieldErrors?: (fieldErrors: Record<string, Record<string, string>>) => void,
): ServiceError[] => {
  let modified = false
  const fieldErrors = {}
  const nextServiceErrorList = serviceErrorException.serviceErrorList
    .reduce<ServiceError[]>(
    (nextServiceErrorList, serviceError) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graphQlError: any = serviceError.data
      const path = [...(graphQlError?.path ?? []), serviceError.key].join('.')
      const errorMapper = get(normalisedErrorMap, path, undefined) as ErrorMapper

      if (errorMapper) {
        const nextServiceError = errorMapper({
          error: serviceError,
          fieldErrors,
          path,
        })
        modified = true
        if (nextServiceError) {
          nextServiceErrorList.push(nextServiceError)
        }
      }

      return nextServiceErrorList
    }, [])
    .filter(serviceError => serviceError)

  if (onFieldErrors) {
    onFieldErrors(fieldErrors)
  }

  if (modified) {
    serviceErrorException.serviceErrorList = nextServiceErrorList
    return nextServiceErrorList
  }
  return serviceErrorException.serviceErrorList
}

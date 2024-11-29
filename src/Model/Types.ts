/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2022-03-17T10:03:96+01:00
 * @Copyright: Technology Studio
**/

import type { ServiceError } from '@txo/service-prop'

export type ErrorMapper = ((options: {
  error: ServiceError,
  fieldErrors?: Record<string, Record<string, string>>,
  path: string,
}) => ServiceError | undefined) | undefined

export type ErrorMap = { [key: string]: ErrorMap } | ErrorMapper

/** @deprecated - import from `@txo-peer-dep/error-handler` */
export const VALIDATION_ERROR = 'VALIDATION_ERROR'

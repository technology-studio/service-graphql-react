/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2022-03-17T10:03:96+01:00
 * @Copyright: Technology Studio
**/

import { ServiceError } from '@txo/service-prop'

export type ErrorMapper = ((options: {
  error: ServiceError,
  fieldErrors?: Record<string, Record<string, string>>,
  path: string,
}) => ServiceError | undefined) | undefined

export type ErrorMap = { [key: string]: ErrorMapper | ErrorMap }

export const VALIDATION_ERROR = 'VALIDATION_ERROR'

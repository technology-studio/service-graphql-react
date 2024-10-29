/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2022-01-24T13:01:19+01:00
 * @Copyright: Technology Studio
**/

export { getName } from './Api/OperationHelper'
export * from './Api/ErrorMapHelper'
export * from './Api/ObservableContext'
export * from './Api/PromiseHelper'
export * from './Api/VoidError'
export * from './Hooks/UseServiceMutation'
export {
  useServiceQuery,
  type QueryServiceProp,
} from './Hooks/UseServiceQuery'
export * from './Model/Types'

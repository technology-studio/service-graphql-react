/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-10-13T19:10:73+02:00
 * @Copyright: Technology Studio
**/

export const serviceContext = (serviceName: string, serviceAttributes: Record<string, unknown>): string => (
  `${serviceName}(${JSON.stringify(serviceAttributes)})`.replace(/\./g, '_')
)

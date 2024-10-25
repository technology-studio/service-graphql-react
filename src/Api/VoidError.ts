/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2024-10-25T22:32:09+02:00
 * @Copyright: Technology Studio
**/

export class VoidError extends Error {
  constructor () {
    super('Void validation error')
  }
}

/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2022-06-08T09:06:94+02:00
 * @Copyright: Technology Studio
**/

export type ResultlessPromise = {
  finally: (callback: () => void) => ResultlessPromise,
}

export const suppressResults = (promise: Promise<unknown>): ResultlessPromise => (
  (promise
    .then(async () => Promise.resolve())
    .catch(() => undefined) as ResultlessPromise)
)

export const suppressErrors = <DATA,>(
  promise: Promise<DATA>,
  thenCallback: (data: DATA) => void,
): void => {
  void promise
    .then(thenCallback)
    .catch(() => undefined)
}

export const asyncToCallback = (
  promise: Promise<unknown>,
): void => {
  suppressResults(promise)
}

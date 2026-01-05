import nock from 'nock'
import {
  DEFAULT_DELAY,
  DEFAULT_ERROR,
  DEFAULT_TIMES,
  HOST,
  SHOULD_RUN_ADYEN_API_LIVE_TESTS,
} from './constants'
import {
  DeleteStoredPaymentMethods,
  GetStoredPaymentMethods,
  PostStoredPaymentMethods,
  postCancels,
  postCaptures,
  postPaymentMethods,
  postPayments,
  postRefunds,
  ServerError,
  type StoredPaymentMethodResource,
} from './responses'
import { matchOperation, Operation } from './utils'

export interface IMockAdyenApi {
  deleteStoredPaymentMethods: (
    store: StoredPaymentMethodResource[],
    times?: number,
    delay?: number,
  ) => void
  getStoredPaymentMethods: (
    store: StoredPaymentMethodResource[],
    times?: number,
    delay?: number,
  ) => void
  postStoredPaymentMethods: (
    store: StoredPaymentMethodResource[],
    times?: number,
    delay?: number,
  ) => void
  isDone: () => boolean
  paymentAuthorisation: (times?: number, delay?: number) => void
  paymentAuthorisationServerError: (
    times?: number,
    delay?: number,
    error?: string,
  ) => void
  paymentCancel: (times?: number, delay?: number) => void
  paymentCapture: (times?: number, delay?: number) => void
  paymentMethods: (times?: number, delay?: number) => void
  paymentRefund: (times?: number, delay?: number) => void
  reset: () => void
  scope: nock.Scope | null
}

export const MockAdyenApi = (): IMockAdyenApi => {
  let scope: nock.Scope | null = null

  const reset = () => {
    scope = null
    nock.cleanAll()
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS) return
    scope = nock(HOST)
  }

  const postStoredPaymentMethods = (
    store: StoredPaymentMethodResource[],
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.StoredPaymentMethods))
      .times(times)
      .delay(delay)
      .reply(PostStoredPaymentMethods(store))
  }

  const getStoredPaymentMethods = (
    store: StoredPaymentMethodResource[],
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .get(matchOperation(Operation.StoredPaymentMethods))
      .times(times)
      .delay(delay)
      .reply(GetStoredPaymentMethods(store))
  }

  const deleteStoredPaymentMethods = (
    store: StoredPaymentMethodResource[],
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .delete(matchOperation(Operation.StoredPaymentMethods))
      .times(times)
      .delay(delay)
      .reply(DeleteStoredPaymentMethods(store))
  }

  const paymentMethods = (
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.PaymentMethods))
      .times(times)
      .delay(delay)
      .reply(postPaymentMethods)
  }

  const paymentAuthorisation = (
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Payments))
      .times(times)
      .delay(delay)
      .reply(postPayments)
  }

  const paymentCapture = (
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Captures))
      .times(times)
      .delay(delay)
      .reply(postCaptures)
  }

  const paymentCancel = (
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Cancels))
      .times(times)
      .delay(delay)
      .reply(postCancels)
  }

  const paymentRefund = (
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Refunds))
      .times(times)
      .delay(delay)
      .reply(postRefunds)
  }

  const paymentAuthorisationServerError = (
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
    error: string = DEFAULT_ERROR,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Payments))
      .times(times)
      .delay(delay)
      .reply(ServerError(error))
  }

  const isDone = (): boolean => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return true
    return scope.isDone()
  }

  return {
    deleteStoredPaymentMethods,
    getStoredPaymentMethods,
    isDone,
    paymentAuthorisation,
    paymentAuthorisationServerError,
    paymentCancel,
    paymentCapture,
    paymentMethods,
    paymentRefund,
    postStoredPaymentMethods,
    reset,
    scope,
  }
}

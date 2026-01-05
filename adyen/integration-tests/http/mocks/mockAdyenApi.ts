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
} from './responses'
import { matchOperation, Operation } from './utils'

export interface IMockAdyenApi {
  isDone: () => boolean
  paymentAuthorisation: (times?: number, delay?: number) => void
  paymentCancel: (times?: number, delay?: number) => void
  paymentCapture: (times?: number, delay?: number) => void
  paymentMethods: (times?: number, delay?: number) => void
  paymentRefund: (times?: number, delay?: number) => void
  postServerError: (times?: number, delay?: number, error?: string) => void
  reset: () => void
  scope: nock.Scope | null
  storedPaymentMethods: (
    post?: boolean,
    get?: boolean,
    del?: boolean,
    times?: number,
    delay?: number,
  ) => void
}

export const MockAdyenApi = (): IMockAdyenApi => {
  let scope: nock.Scope | null = null

  const reset = () => {
    scope = null
    nock.cleanAll()
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS) return
    scope = nock(HOST)
  }

  const storedPaymentMethods = (
    post: boolean = true,
    get: boolean = true,
    del: boolean = true,
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    const store = []
    const postStoredPaymentMethods = PostStoredPaymentMethods(store)
    const getStoredPaymentMethods = GetStoredPaymentMethods(store)
    const deleteStoredPaymentMethods = DeleteStoredPaymentMethods(store)
    if (post)
      scope
        .post(matchOperation(Operation.StoredPaymentMethods))
        .times(times)
        .delay(delay)
        .reply(postStoredPaymentMethods)
    if (get)
      scope
        .get(matchOperation(Operation.StoredPaymentMethods))
        .times(times)
        .delay(delay)
        .reply(getStoredPaymentMethods)
    if (del)
      scope
        .delete(matchOperation(Operation.StoredPaymentMethods))
        .times(times)
        .delay(delay)
        .reply(deleteStoredPaymentMethods)
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

  const postServerError = (
    times: number = DEFAULT_TIMES,
    delay: number = DEFAULT_DELAY,
    error: string = DEFAULT_ERROR,
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Any))
      .times(times)
      .delay(delay)
      .replyWithError(error)
  }

  const isDone = (): boolean => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return true
    return scope.isDone()
  }

  return {
    isDone,
    paymentAuthorisation,
    paymentCancel,
    paymentCapture,
    paymentMethods,
    paymentRefund,
    postServerError,
    reset,
    scope,
    storedPaymentMethods,
  }
}

import nock from 'nock'
import { HOST, SHOULD_RUN_ADYEN_API_LIVE_TESTS } from './constants'
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

interface IMockAdyenApi {
  paymentAuthorisation: (times: number, delay: number) => void
  paymentCancel: (times: number, delay: number) => void
  paymentCapture: (times: number, delay: number) => void
  paymentMethods: (times: number, delay: number) => void
  paymentRefund: (times: number, delay: number) => void
  postServerError: (times: number, delay: number, error: string) => void
  reset: () => void
  scope: nock.Scope | null
  storedPaymentMethods: (times: number, delay: number) => void
}

export const MockAdyenApi = (): IMockAdyenApi => {
  let scope: nock.Scope | null = null

  const reset = () => {
    scope = null
    nock.cleanAll()
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS) return
    scope = nock(HOST)
  }

  const storedPaymentMethods = (times: number = 1, delay: number = 50) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    const store = []
    const postStoredPaymentMethods = PostStoredPaymentMethods(store)
    const getStoredPaymentMethods = GetStoredPaymentMethods(store)
    const deleteStoredPaymentMethods = DeleteStoredPaymentMethods(store)
    scope
      .post(matchOperation(Operation.StoredPaymentMethods))
      .times(times)
      .delay(delay)
      .reply(postStoredPaymentMethods)
    scope
      .get(matchOperation(Operation.StoredPaymentMethods))
      .times(times)
      .delay(delay)
      .reply(getStoredPaymentMethods)
    scope
      .delete(matchOperation(Operation.StoredPaymentMethods))
      .times(times)
      .delay(delay)
      .reply(deleteStoredPaymentMethods)
  }

  const paymentMethods = (times: number = 1, delay: number = 50) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.PaymentMethods))
      .times(times)
      .delay(delay)
      .reply(postPaymentMethods)
  }

  const paymentAuthorisation = (times: number = 1, delay: number = 50) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Payments))
      .times(times)
      .delay(delay)
      .reply(postPayments)
  }

  const paymentCapture = (times: number = 1, delay: number = 50) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Captures))
      .times(times)
      .delay(delay)
      .reply(postCaptures)
  }

  const paymentCancel = (times: number = 1, delay: number = 50) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Cancels))
      .times(times)
      .delay(delay)
      .reply(postCancels)
  }

  const paymentRefund = (times: number = 1, delay: number = 50) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Refunds))
      .times(times)
      .delay(delay)
      .reply(postRefunds)
  }

  const postServerError = (
    times: number = 1,
    delay: number = 50,
    error: string = 'Server error',
  ) => {
    if (SHOULD_RUN_ADYEN_API_LIVE_TESTS || scope === null) return
    scope
      .post(matchOperation(Operation.Any))
      .times(times)
      .delay(delay)
      .replyWithError(error)
  }

  return {
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

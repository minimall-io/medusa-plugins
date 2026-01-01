import { Types } from '@adyen/api-library'
import { filter, remove } from 'lodash'
import nock from 'nock'

type PaymentMethodsResponse = Types.checkout.PaymentMethodsResponse
type PaymentRequest = Types.checkout.PaymentRequest
type PaymentResponse = Types.checkout.PaymentResponse
type PaymentCancelRequest = Types.checkout.PaymentCancelRequest
type PaymentCancelResponse = Types.checkout.PaymentCancelResponse
type PaymentCaptureRequest = Types.checkout.PaymentCaptureRequest
type PaymentCaptureResponse = Types.checkout.PaymentCaptureResponse
type PaymentRefundRequest = Types.checkout.PaymentRefundRequest
type PaymentRefundResponse = Types.checkout.PaymentRefundResponse
type StoredPaymentMethodRequest = Types.checkout.StoredPaymentMethodRequest
type StoredPaymentMethodResource = Types.checkout.StoredPaymentMethodResource
type ListStoredPaymentMethodsResponse =
  Types.checkout.ListStoredPaymentMethodsResponse
const ResultCodeEnum = Types.checkout.PaymentResponse.ResultCodeEnum
const StatusEnum = Types.checkout.PaymentCancelResponse.StatusEnum

enum Operation {
  PaymentMethods,
  Payments,
  Cancels,
  Captures,
  Refunds,
  StoredPaymentMethods,
}

export interface IMockAdyenApi {
  reset: () => void
  scope: nock.Scope | null
}

const shouldRunAdyenApiLiveTests = process.env.ADYEN_API_LIVE_TESTS === 'true'
const HOST = 'https://checkout-test.adyen.com'

const getURL = (uri: string): URL => new URL(uri, HOST)

const getSegments = (uri: string): string[] => {
  const url = getURL(uri)
  const path = url.pathname
  return path.split('/').slice(2)
}

const getSearchParams = (uri: string): URLSearchParams => {
  const url = getURL(uri)
  return url.searchParams
}

const matchOperation =
  (filter: Operation) =>
  (uri: string): boolean => {
    const segments = getSegments(uri)
    if (segments.length === 0) return false
    const [operation, _, modification] = segments

    switch (filter) {
      case Operation.PaymentMethods:
        return operation === 'paymentMethods'
      case Operation.StoredPaymentMethods:
        return operation === 'storedPaymentMethods'
      case Operation.Payments:
        return operation === 'payments' && modification === undefined
      case Operation.Cancels:
        return operation === 'payments' && modification === 'cancels'
      case Operation.Captures:
        return operation === 'payments' && modification === 'captures'
      case Operation.Refunds:
        return operation === 'payments' && modification === 'refunds'
      default:
        return false
    }
  }

const StoredPaymentMethodsResponses = () => {
  const store: StoredPaymentMethodResource[] = []

  const postStoredPaymentMethods = (
    _,
    requestBody: StoredPaymentMethodRequest,
  ) => {
    const { shopperReference, paymentMethod } = requestBody
    const expiryMonth = paymentMethod.encryptedExpiryMonth?.slice(-2)
    const expiryYear = paymentMethod.encryptedExpiryYear?.slice(-4)
    const lastFour = paymentMethod.encryptedCardNumber?.slice(-4)
    const holderName = paymentMethod.holderName
    const type = paymentMethod.type
    const id = `ID${Date.now()}`
    const responseBody: StoredPaymentMethodResource = {
      expiryMonth,
      expiryYear,
      holderName,
      id,
      lastFour,
      shopperReference,
      type,
    }
    store.push(responseBody)
    return [200, responseBody]
  }

  const getStoredPaymentMethods = (uri: string) => {
    const searchParams = getSearchParams(uri)
    const shopperReference = searchParams.get('shopperReference') || undefined
    const merchantAccount = searchParams.get('merchantAccount') || undefined
    const storedPaymentMethods = filter(store, { shopperReference })
    const responseBody: ListStoredPaymentMethodsResponse = {
      merchantAccount,
      shopperReference,
      storedPaymentMethods,
    }
    return [200, responseBody]
  }

  const deleteStoredPaymentMethods = (uri: string) => {
    const [, id] = getSegments(uri)
    remove(store, { id })
    return [200, {}]
  }

  return {
    deleteStoredPaymentMethods,
    getStoredPaymentMethods,
    postStoredPaymentMethods,
  }
}

const PaymentsResponses = () => {
  const getPspReference = (): string => `PSP${Date.now()}`
  const getReference = (): string => `ref_${Date.now()}`

  const postPaymentMethods = () => {
    const responseBody: PaymentMethodsResponse = {
      'paymentMethods': [
        {
          'brands': ['amex', 'cup', 'diners', 'discover', 'mc', 'visa'],
          'name': 'Cards',
          'type': 'scheme',
        },
        { 'name': 'Pay later with Klarna.', 'type': 'klarna' },
        { 'name': 'Pay over time with Klarna.', 'type': 'klarna_account' },
      ],
    }
    return [200, responseBody]
  }

  const postPayments = (_, requestBody: PaymentRequest) => {
    const {
      amount: { value = 10000, currency = 'USD' },
      reference = getReference(),
    } = requestBody
    const pspReference = getPspReference()
    const resultCode = ResultCodeEnum.Authorised
    const responseBody: PaymentResponse = {
      amount: { currency, value },
      merchantReference: reference,
      pspReference,
      resultCode,
    }
    return [200, responseBody]
  }

  const postCancels = (uri: string, requestBody: PaymentCancelRequest) => {
    const [, paymentPspReference] = getSegments(uri)
    const { merchantAccount, reference = getReference() } = requestBody
    const pspReference = getPspReference()
    const status = StatusEnum.Received
    const responseBody: PaymentCancelResponse = {
      merchantAccount,
      paymentPspReference,
      pspReference,
      reference,
      status,
    }
    return [200, responseBody]
  }

  const postCaptures = (uri: string, requestBody: PaymentCaptureRequest) => {
    const [, paymentPspReference] = getSegments(uri)
    const {
      amount: { value = 10000, currency = 'USD' },
      reference = getReference(),
      merchantAccount,
    } = requestBody
    const pspReference = getPspReference()
    const status = StatusEnum.Received
    const responseBody: PaymentCaptureResponse = {
      amount: { currency, value },
      merchantAccount,
      paymentPspReference,
      pspReference,
      reference,
      status,
    }
    return [200, responseBody]
  }

  const postRefunds = (uri: string, requestBody: PaymentRefundRequest) => {
    const [, paymentPspReference] = getSegments(uri)
    const {
      amount: { value = 10000, currency = 'USD' },
      reference = getReference(),
      merchantAccount,
    } = requestBody
    const pspReference = getPspReference()
    const status = StatusEnum.Received
    const responseBody: PaymentRefundResponse = {
      amount: { currency, value },
      merchantAccount,
      paymentPspReference,
      pspReference,
      reference,
      status,
    }
    return [200, responseBody]
  }

  return {
    postCancels,
    postCaptures,
    postPaymentMethods,
    postPayments,
    postRefunds,
  }
}

const CreateAdyenApiScope = () => {
  const {
    postStoredPaymentMethods,
    getStoredPaymentMethods,
    deleteStoredPaymentMethods,
  } = StoredPaymentMethodsResponses()
  const {
    postCancels,
    postCaptures,
    postPayments,
    postRefunds,
    postPaymentMethods,
  } = PaymentsResponses()
  const scope = nock(HOST)
  scope
    .persist()
    .post(matchOperation(Operation.PaymentMethods))
    .delay(50)
    .reply(postPaymentMethods)
  scope
    .persist()
    .post(matchOperation(Operation.Payments))
    .delay(50)
    .reply(postPayments)
  scope
    .persist()
    .post(matchOperation(Operation.Cancels))
    .delay(50)
    .reply(postCancels)
  scope
    .persist()
    .post(matchOperation(Operation.Captures))
    .delay(50)
    .reply(postCaptures)
  scope
    .persist()
    .post(matchOperation(Operation.Refunds))
    .delay(50)
    .reply(postRefunds)
  scope
    .persist()
    .post(matchOperation(Operation.StoredPaymentMethods))
    .delay(50)
    .reply(postStoredPaymentMethods)
  scope
    .persist()
    .get(matchOperation(Operation.StoredPaymentMethods))
    .delay(50)
    .reply(getStoredPaymentMethods)
  scope
    .persist()
    .delete(matchOperation(Operation.StoredPaymentMethods))
    .delay(50)
    .reply(deleteStoredPaymentMethods)
  return scope
}

export const MockAdyenApi = (): IMockAdyenApi => {
  let scope: nock.Scope | null = null

  const reset = () => {
    scope = null
    nock.cleanAll()
    if (shouldRunAdyenApiLiveTests) return
    scope = CreateAdyenApiScope()
  }

  return { reset, scope }
}

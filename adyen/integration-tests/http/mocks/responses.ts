import { Types } from '@adyen/api-library'
import { filter, remove } from 'lodash'
import { getSearchParams, getSegments } from './utils'

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
type ListStoredPaymentMethodsResponse =
  Types.checkout.ListStoredPaymentMethodsResponse
const ResultCodeEnum = Types.checkout.PaymentResponse.ResultCodeEnum
const StatusEnum = Types.checkout.PaymentCancelResponse.StatusEnum

export type StoredPaymentMethodResource =
  Types.checkout.StoredPaymentMethodResource

const getPspReference = (): string => `PSP${Date.now()}`
const getReference = (): string => `ref_${Date.now()}`

export const PostStoredPaymentMethods =
  (store: StoredPaymentMethodResource[]) =>
  (_, requestBody: StoredPaymentMethodRequest) => {
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

export const GetStoredPaymentMethods =
  (store: StoredPaymentMethodResource[]) => (uri: string) => {
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

export const DeleteStoredPaymentMethods =
  (store: StoredPaymentMethodResource[]) => (uri: string) => {
    const [, id] = getSegments(uri)
    remove(store, { id })
    return [200, {}]
  }

export const postPaymentMethods = () => {
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

export const postPayments = (_, requestBody: PaymentRequest) => {
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

export const postCancels = (uri: string, requestBody: PaymentCancelRequest) => {
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

export const postCaptures = (
  uri: string,
  requestBody: PaymentCaptureRequest,
) => {
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

export const postRefunds = (uri: string, requestBody: PaymentRefundRequest) => {
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

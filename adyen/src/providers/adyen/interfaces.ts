import { Types } from '@adyen/api-library'
import { PaymentModification } from './validators'

type PaymentRequest = Types.checkout.PaymentRequest

export interface Shopper
  extends Pick<
    PaymentRequest,
    | 'shopperReference'
    | 'shopperEmail'
    | 'telephoneNumber'
    | 'shopperName'
    | 'company'
    | 'countryCode'
  > {}

export interface InitiatePaymentInputData {
  request: Types.checkout.PaymentMethodsRequest
}

export interface SavePaymentMethodInputData {
  request: Types.checkout.StoredPaymentMethodRequest
}

export interface AuthorizePaymentInputData {
  amount: Types.checkout.Amount
  request: Types.checkout.PaymentRequest
  shopper?: Shopper
}

export interface PaymentModificationData {
  amount: Types.checkout.Amount
  authorization: Types.checkout.PaymentResponse
  cancellation?: PaymentModification
  captures?: PaymentModification[]
  refunds?: PaymentModification[]
  message?: Types.notification.NotificationRequestItem
}

export type ProviderWebhookPayloadData = Types.notification.Notification

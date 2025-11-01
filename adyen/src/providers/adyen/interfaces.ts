import { Types } from '@adyen/api-library'
import { PaymentModification } from './validators'

export interface Data {
  reference: string
  authorization: Types.checkout.PaymentResponse
  cancellation?: PaymentModification
  captures?: PaymentModification[]
  refunds?: PaymentModification[]
  message?: Types.notification.NotificationRequestItem
}

export interface AuthorizePaymentInputData extends Partial<Data> {
  request: Types.checkout.PaymentRequest
}

export interface InitiatePaymentInputData extends Partial<Data> {
  request: Types.checkout.PaymentMethodsRequest
}

export interface SavePaymentMethodInputData extends Partial<Data> {
  request: Types.checkout.StoredPaymentMethodRequest
}

export interface PaymentModificationData extends Data {}

export type ProviderWebhookPayloadData = Types.notification.Notification

import { Types } from '@adyen/api-library'

import { PaymentDTO } from '@medusajs/framework/types'

export { PaymentDTO }
export type Data = Record<string, unknown>

export type NotificationRequestItem = Types.notification.NotificationRequestItem
export type PaymentCancelResponse =
  Types.checkout.StandalonePaymentCancelResponse
export type PaymentCaptureResponse = Types.checkout.PaymentCaptureResponse
export type PaymentRefundResponse = Types.checkout.PaymentRefundResponse

export const EventCodeEnum =
  Types.notification.NotificationRequestItem.EventCodeEnum
export const SuccessEnum =
  Types.notification.NotificationRequestItem.SuccessEnum

export interface NotificationWorkflowInput {
  notification: NotificationRequestItem
  payment: PaymentDTO
}

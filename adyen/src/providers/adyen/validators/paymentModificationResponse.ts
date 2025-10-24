import { z } from 'zod'
import {
  PaymentCancelResponseSchema,
  PaymentCaptureResponsesSchema,
  PaymentRefundResponsesSchema,
} from './core'
import { getValidator } from './helpers'

export type PaymentCancelResponse = z.infer<typeof PaymentCancelResponseSchema>

export type PaymentCaptureResponses = z.infer<
  typeof PaymentCaptureResponsesSchema
>

export type PaymentRefundResponses = z.infer<
  typeof PaymentRefundResponsesSchema
>

export const validatePaymentCancelResponse =
  getValidator<PaymentCancelResponse>(PaymentCancelResponseSchema)

export const validatePaymentCaptureResponses =
  getValidator<PaymentCaptureResponses>(PaymentCaptureResponsesSchema)

export const validatePaymentRefundResponses =
  getValidator<PaymentRefundResponses>(PaymentRefundResponsesSchema)

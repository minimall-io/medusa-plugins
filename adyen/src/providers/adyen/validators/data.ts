import { Types } from '@adyen/api-library'
import { z } from 'zod'
import { getValidator } from './helpers'
import { PaymentCancelResponseSchema } from './paymentCancelResponse'
import { PaymentCaptureResponseSchema } from './paymentCaptureResponse'
import { PaymentMethodsRequestSchema } from './paymentMethodsRequest'
import { PaymentRefundResponseSchema } from './paymentRefundResponse'
import { PaymentRequestSchema } from './paymentRequest'
import { PaymentResponseSchema } from './paymentResponse'

interface AdyenData {
  paymentMethodsRequest: Types.checkout.PaymentMethodsRequest
  paymentRequest: Types.checkout.PaymentRequest
  paymentMethodsResponse: Types.checkout.PaymentMethodsResponse
  paymentResponse: Types.checkout.PaymentResponse // Focus
  paymentCaptureResponse: Types.checkout.PaymentCaptureResponse
  a: Types.checkout.PaymentCaptureRequest
  paymentCancelResponse: Types.checkout.PaymentCancelResponse
  paymentRefundResponse: Types.checkout.PaymentRefundResponse
}

export const TransientDataSchema = z.object({
  sessionId: z.string(),
  paymentResponse: PaymentResponseSchema.nullable(),
  paymentCaptureResponse: PaymentCaptureResponseSchema.nullable(),
  paymentCancelResponse: PaymentCancelResponseSchema.nullable(),
  paymentRefundResponse: PaymentRefundResponseSchema.nullable(),
})

export const DataSchema = TransientDataSchema.extend({
  paymentRequest: z
    .union([
      PaymentRequestSchema.partial(),
      PaymentMethodsRequestSchema.partial(),
    ])
    .optional(),
  session_id: z.string().optional(),
}).partial()

export type TransientData = z.infer<typeof TransientDataSchema>

export type Data = z.infer<typeof DataSchema>

export const validateTransientData =
  getValidator<TransientData>(TransientDataSchema)

export const validateData = getValidator<Data>(DataSchema)

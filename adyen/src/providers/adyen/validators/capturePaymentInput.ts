import { z } from 'zod'
import { PaymentResponseSchema } from './core'
import { getValidator } from './helpers'
import { UnknownArraySchema } from './primitives'

const DataSchema = z.object({
  reference: z.string(),
  paymentResponse: PaymentResponseSchema,
  paymentCaptures: UnknownArraySchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema,
})

export type CapturePaymentInput = z.infer<typeof InputSchema>

export const validateCapturePaymentInput =
  getValidator<CapturePaymentInput>(InputSchema)

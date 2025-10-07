import { z } from 'zod'
import { PaymentResponseSchema } from './core'
import { getValidator } from './helpers'
import { UnknownArraySchema } from './primitives'

const DataSchema = z.object({
  reference: z.string(),
  paymentResponse: PaymentResponseSchema,
  paymentRefundResponses: UnknownArraySchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema,
  amount: z.any(),
})

export type RefundPaymentInput = z.infer<typeof InputSchema>

export const validateRefundPaymentInput =
  getValidator<RefundPaymentInput>(InputSchema)

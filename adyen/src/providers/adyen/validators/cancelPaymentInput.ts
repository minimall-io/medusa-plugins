import { z } from 'zod'
import { PaymentResponseSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  paymentResponse: PaymentResponseSchema,
})

const InputSchema = z.object({
  data: DataSchema,
})

export type CancelPaymentInput = z.infer<typeof InputSchema>

export const validateCancelPaymentInput =
  getValidator<CancelPaymentInput>(InputSchema)

import { z } from 'zod'
import { getValidator } from './helpers'

const PaymentResponseSchema = z.object({
  merchantReference: z.string(),
  pspReference: z.string(),
})

const DataSchema = z.object({
  paymentResponse: PaymentResponseSchema,
})

const InputSchema = z.object({
  data: DataSchema,
})

export type CancelPaymentInput = z.infer<typeof InputSchema>

export const validateCancelPaymentInput =
  getValidator<CancelPaymentInput>(InputSchema)

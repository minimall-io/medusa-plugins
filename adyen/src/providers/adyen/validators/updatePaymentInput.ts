import { z } from 'zod'
import { PaymentResponseSchema } from './core'
import { getValidator } from './helpers'
import { UnknownArraySchema } from './primitives'

const DataSchema = z.object({
  reference: z.string(),
  paymentResponse: PaymentResponseSchema,
  paymentAmountUpdateResponses: UnknownArraySchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema,
  amount: z.any(),
  currency_code: z.string(),
})

export type UpdatePaymentInput = z.infer<typeof InputSchema>

export const validateUpdatePaymentInput =
  getValidator<UpdatePaymentInput>(InputSchema)

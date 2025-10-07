import { z } from 'zod'
import { PaymentMethodsRequestSchema, PaymentRequestSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  paymentRequest: PaymentMethodsRequestSchema.merge(PaymentRequestSchema),
})

const InputSchema = z.object({
  data: DataSchema,
})

export type AuthorizePaymentInput = z.infer<typeof InputSchema>

export const validateAuthorizePaymentInput =
  getValidator<AuthorizePaymentInput>(InputSchema)

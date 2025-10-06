import { z } from 'zod'
import { getValidator } from './helpers'
import { PaymentMethodsRequestSchema } from './paymentMethodsRequest'
import { PaymentRequestSchema } from './paymentRequest'

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

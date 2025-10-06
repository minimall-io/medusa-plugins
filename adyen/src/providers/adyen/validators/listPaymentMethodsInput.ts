import { z } from 'zod'
import { getValidator } from './helpers'
import { PaymentMethodsRequestSchema } from './paymentMethodsRequest'

const DataSchema = z.object({
  paymentRequest: PaymentMethodsRequestSchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema.optional(),
})

export type ListPaymentMethodsInput = z.infer<typeof InputSchema>

export const validateListPaymentMethodsInput =
  getValidator<ListPaymentMethodsInput>(InputSchema)

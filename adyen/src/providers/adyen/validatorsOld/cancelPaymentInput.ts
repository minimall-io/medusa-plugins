import { z } from 'zod'
import { PaymentProviderContextSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
})

const InputSchema = z.object({
  context: PaymentProviderContextSchema.partial().optional(),
  data: DataSchema,
})

export type CancelPaymentInput = z.infer<typeof InputSchema>

export const validateCancelPaymentInput =
  getValidator<CancelPaymentInput>(InputSchema)

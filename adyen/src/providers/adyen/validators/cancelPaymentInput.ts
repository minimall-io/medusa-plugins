import { z } from 'zod'
import { PaymentProviderContextSchema, PaymentProviderDataSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = PaymentProviderDataSchema.pick({ reference: true })

const InputSchema = z.object({
  data: DataSchema,
  context: PaymentProviderContextSchema.partial().optional(),
})

export type CancelPaymentInput = z.infer<typeof InputSchema>

export const validateCancelPaymentInput =
  getValidator<CancelPaymentInput>(InputSchema)

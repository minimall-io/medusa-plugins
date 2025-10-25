import { z } from 'zod'
import { PaymentProviderContextSchema, PaymentProviderDataSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = PaymentProviderDataSchema.pick({
  reference: true,
  sessionsResponse: true,
})

const InputSchema = z.object({
  data: DataSchema,
  context: PaymentProviderContextSchema.partial().optional(),
  amount: z.any(),
  currency_code: z.string(),
})

export type UpdatePaymentInput = z.infer<typeof InputSchema>

export const validateUpdatePaymentInput =
  getValidator<UpdatePaymentInput>(InputSchema)

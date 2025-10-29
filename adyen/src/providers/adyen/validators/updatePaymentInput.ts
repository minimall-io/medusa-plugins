import { z } from 'zod'
import { PaymentProviderContextSchema, SessionsResponseSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  sessionsResponse: SessionsResponseSchema,
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

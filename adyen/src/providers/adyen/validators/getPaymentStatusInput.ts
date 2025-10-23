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
})

export type GetPaymentStatusInput = z.infer<typeof InputSchema>

export const validateGetPaymentStatusInput =
  getValidator<GetPaymentStatusInput>(InputSchema)

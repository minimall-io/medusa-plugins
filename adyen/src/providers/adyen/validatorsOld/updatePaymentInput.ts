import { z } from 'zod'
import {
  AccountHolderDTOSchema,
  PaymentMethodsRequestSchema,
  PaymentProviderContextSchema,
} from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  request: PaymentMethodsRequestSchema.optional(),
  session_id: z.string(),
})

const ContextSchema = PaymentProviderContextSchema.partial().extend({
  account_holder: AccountHolderDTOSchema.pick({ data: true }).optional(),
})

const InputSchema = z.object({
  amount: z.any(),
  context: ContextSchema.optional(),
  currency_code: z.string(),
  data: DataSchema.partial().optional(),
})

export type UpdatePaymentInput = z.infer<typeof InputSchema>

export const validateUpdatePaymentInput =
  getValidator<UpdatePaymentInput>(InputSchema)

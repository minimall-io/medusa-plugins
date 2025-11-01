import { z } from 'zod'
import {
  AccountHolderDTOSchema,
  PaymentMethodsRequestSchema,
  PaymentProviderContextSchema,
} from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  session_id: z.string(),
  request: PaymentMethodsRequestSchema.optional(),
})

const ContextSchema = PaymentProviderContextSchema.partial().extend({
  account_holder: AccountHolderDTOSchema.pick({ data: true }).optional(),
})

const InputSchema = z.object({
  data: DataSchema.partial().optional(),
  context: ContextSchema.optional(),
  amount: z.any(),
  currency_code: z.string(),
})

export type UpdatePaymentInput = z.infer<typeof InputSchema>

export const validateUpdatePaymentInput =
  getValidator<UpdatePaymentInput>(InputSchema)

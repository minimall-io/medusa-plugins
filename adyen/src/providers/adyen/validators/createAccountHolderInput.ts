import { z } from 'zod'
import { PaymentCustomerDTOSchema, PaymentProviderContextSchema } from './core'
import { getValidator } from './helpers'

const ContextSchema = PaymentProviderContextSchema.partial().extend({
  customer: PaymentCustomerDTOSchema.pick({ id: true }),
})

const InputSchema = z.object({
  context: ContextSchema,
})

export type CreateAccountHolderInput = z.infer<typeof InputSchema>

export const validateCreateAccountHolderInput =
  getValidator<CreateAccountHolderInput>(InputSchema)

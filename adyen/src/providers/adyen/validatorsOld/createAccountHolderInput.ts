import { z } from 'zod'
import { PaymentProviderContextSchema } from './core'
import { getValidator } from './helpers'

const ContextSchema = PaymentProviderContextSchema.partial({
  idempotency_key: true,
  account_holder: true,
})

const InputSchema = z.object({
  context: ContextSchema,
})

export type CreateAccountHolderInput = z.infer<typeof InputSchema>

export const validateCreateAccountHolderInput =
  getValidator<CreateAccountHolderInput>(InputSchema)

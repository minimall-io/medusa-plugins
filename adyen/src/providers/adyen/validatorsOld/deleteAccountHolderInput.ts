import { z } from 'zod'
import { AccountHolderDTOSchema, PaymentProviderContextSchema } from './core'
import { getValidator } from './helpers'

const ContextSchema = PaymentProviderContextSchema.partial().extend({
  account_holder: AccountHolderDTOSchema.pick({ external_id: true }),
})

const InputSchema = z.object({
  context: ContextSchema,
})

export type DeleteAccountHolderInput = z.infer<typeof InputSchema>

export const validateDeleteAccountHolderInput =
  getValidator<DeleteAccountHolderInput>(InputSchema)

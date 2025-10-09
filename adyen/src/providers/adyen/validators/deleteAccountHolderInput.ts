import { z } from 'zod'
import { getValidator } from './helpers'

const AccountHolderSchema = z.object({
  id: z.string(),
})

const ContextSchema = z.object({
  account_holder: AccountHolderSchema,
})

const InputSchema = z.object({
  context: ContextSchema,
})

export type DeleteAccountHolderInput = z.infer<typeof InputSchema>

export const validateDeleteAccountHolderInput =
  getValidator<DeleteAccountHolderInput>(InputSchema)

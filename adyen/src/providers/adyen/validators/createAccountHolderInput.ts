import { z } from 'zod'
import { getValidator } from './helpers'

const CustomerSchema = z.object({
  id: z.string(),
})

const ContextSchema = z.object({
  customer: CustomerSchema,
})

const InputSchema = z.object({
  context: ContextSchema,
})

export type CreateAccountHolderInput = z.infer<typeof InputSchema>

export const validateCreateAccountHolderInput =
  getValidator<CreateAccountHolderInput>(InputSchema)

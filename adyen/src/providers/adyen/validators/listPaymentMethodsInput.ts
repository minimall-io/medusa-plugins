import { z } from 'zod'
import { UnknownRecordSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  id: z.string(),
})

const AccountHolderSchema = z.object({
  data: DataSchema,
})

const ContextSchema = z.object({
  account_holder: AccountHolderSchema,
})

const InputSchema = z.object({
  data: UnknownRecordSchema.optional(),
  context: ContextSchema,
})

export type ListPaymentMethodsInput = z.infer<typeof InputSchema>

export const validateListPaymentMethodsInput =
  getValidator<ListPaymentMethodsInput>(InputSchema)

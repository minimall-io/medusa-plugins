import { z } from 'zod'
import { getValidator } from './helpers'
import { UnknownRecordSchema } from './primitives'

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

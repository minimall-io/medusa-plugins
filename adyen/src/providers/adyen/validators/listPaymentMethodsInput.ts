import { z } from 'zod'
import {
  AccountHolderDTOSchema,
  PaymentProviderContextSchema,
  UnknownRecordSchema,
} from './core'
import { getValidator } from './helpers'

const ContextSchema = PaymentProviderContextSchema.partial().extend({
  account_holder: AccountHolderDTOSchema.pick({ data: true }),
})

const InputSchema = z.object({
  data: UnknownRecordSchema.optional(),
  context: ContextSchema,
})

export type ListPaymentMethodsInput = z.infer<typeof InputSchema>

export const validateListPaymentMethodsInput =
  getValidator<ListPaymentMethodsInput>(InputSchema)

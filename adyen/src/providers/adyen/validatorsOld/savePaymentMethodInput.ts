import { z } from 'zod'
import {
  AccountHolderDTOSchema,
  PaymentProviderContextSchema,
  StoredPaymentMethodRequestSchema,
} from './core'
import { getValidator } from './helpers'

const RequestSchema = StoredPaymentMethodRequestSchema.omit({
  merchantAccount: true,
  recurringProcessingModel: true,
  shopperReference: true,
})

const DataSchema = z.object({
  request: RequestSchema,
})

const ContextSchema = PaymentProviderContextSchema.partial().extend({
  account_holder: AccountHolderDTOSchema.pick({ data: true }),
})

const InputSchema = z.object({
  data: DataSchema,
  context: ContextSchema,
})

export type SavePaymentMethodInput = z.infer<typeof InputSchema>

export const validateSavePaymentMethodInput =
  getValidator<SavePaymentMethodInput>(InputSchema)

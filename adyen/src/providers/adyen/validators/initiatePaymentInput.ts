import { z } from 'zod'
import {
  AccountHolderDTOSchema,
  PaymentProviderContextSchema,
  PaymentProviderDataSchema,
} from './core'
import { getValidator } from './helpers'

const DataSchema = PaymentProviderDataSchema.pick({
  session_id: true,
  createCheckoutSessionRequest: true,
  sessionsResponse: true,
})

const AccountHolderSchema = AccountHolderDTOSchema.pick({
  data: true,
  id: true,
})

const ContextSchema = PaymentProviderContextSchema.partial().extend({
  account_holder: AccountHolderSchema.partial({ id: true }).optional(),
})

const InputSchema = z.object({
  data: DataSchema.partial().optional(),
  context: ContextSchema.optional(),
  amount: z.any(),
  currency_code: z.string(),
})

const ValidatedInputSchema = InputSchema.extend({
  reference: z.string(),
})

type ValidatedInput = z.infer<typeof ValidatedInputSchema>

export type InitiatePaymentInput = z.infer<typeof InputSchema>

export const validateInitiatePaymentInput = (
  input: InitiatePaymentInput,
): ValidatedInput => {
  const validateInput = getValidator<InitiatePaymentInput>(InputSchema)
  const validateString = getValidator<string>(z.string())

  const validInput = validateInput(input)
  const reference = validateString(
    validInput.data?.session_id || validInput.context?.idempotency_key,
  )
  return {
    ...validInput,
    reference,
  }
}

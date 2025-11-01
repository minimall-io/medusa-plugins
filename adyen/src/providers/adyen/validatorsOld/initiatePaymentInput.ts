import { z } from 'zod'
import {
  AccountHolderDTOSchema,
  PaymentMethodsRequestSchema,
  PaymentProviderContextSchema,
} from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  session_id: z.string(),
  request: PaymentMethodsRequestSchema.optional(),
})

const ContextSchema = PaymentProviderContextSchema.partial().extend({
  account_holder: AccountHolderDTOSchema.pick({ data: true }).optional(),
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

  const rawReference =
    validInput.data?.session_id || validInput.context?.idempotency_key
  const reference = validateString(rawReference)
  return {
    ...validInput,
    reference,
  }
}

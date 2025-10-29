import { z } from 'zod'
import {
  AccountHolderDTOSchema,
  CheckoutSessionSchema,
  PaymentProviderContextSchema,
} from './core'
import { getValidator } from './helpers'

const PartialCheckoutSessionSchema = CheckoutSessionSchema.omit({
  dateOfBirth: true,
})
  .partial({
    amount: true,
    expiresAt: true,
    id: true,
    merchantAccount: true,
    reference: true,
    returnUrl: true,
  })
  .extend({
    dateOfBirth: z.string().optional(),
  })

const DataSchema = z.object({
  reference: z.string(),
  session_id: z.string(),
  checkoutSession: PartialCheckoutSessionSchema,
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

  const rawReference =
    validInput.data?.session_id || validInput.context?.idempotency_key
  const reference = validateString(rawReference)
  return {
    ...validInput,
    reference,
  }
}

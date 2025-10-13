import { z } from 'zod'
import {
  CreateCheckoutSessionRequestSchema,
  SessionsResponseSchema,
  UnknownRecordSchema,
} from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  session_id: z.string().optional(),
  createCheckoutSessionRequest: CreateCheckoutSessionRequestSchema.optional(),
  sessionsResponse: SessionsResponseSchema.optional(),
})

const AccountHolderSchema = z.object({
  data: UnknownRecordSchema,
  id: z.string().optional(),
})

const ContextSchema = z.object({
  idempotency_key: z.string().optional(),
  account_holder: AccountHolderSchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema.optional(),
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

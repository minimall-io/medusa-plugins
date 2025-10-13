import { z } from 'zod'
import {
  AmountSchema,
  SessionResultResponseSchema,
  UnknownArraySchema,
} from './core'
import { getValidator } from './helpers'

const CreateCheckoutSessionResponseSchema = z.object({
  amount: AmountSchema,
})

const DataSchema = z.object({
  reference: z.string(),
  createCheckoutSessionResponse: CreateCheckoutSessionResponseSchema,
  sessionResultResponse: SessionResultResponseSchema,
  paymentRefundResponses: UnknownArraySchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema,
  amount: z.any(),
})

export type RefundPaymentInput = z.infer<typeof InputSchema>

export const validateRefundPaymentInput =
  getValidator<RefundPaymentInput>(InputSchema)

import { z } from 'zod'
import {
  CreateCheckoutSessionResponseSchema,
  PaymentProviderContextSchema,
  SessionResultResponseSchema,
  UnknownArraySchema,
} from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  createCheckoutSessionResponse: CreateCheckoutSessionResponseSchema,
  sessionResultResponse: SessionResultResponseSchema,
  paymentRefundResponses: UnknownArraySchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema,
  context: PaymentProviderContextSchema.partial().optional(),
  amount: z.any(),
})

export type RefundPaymentInput = z.infer<typeof InputSchema>

export const validateRefundPaymentInput =
  getValidator<RefundPaymentInput>(InputSchema)

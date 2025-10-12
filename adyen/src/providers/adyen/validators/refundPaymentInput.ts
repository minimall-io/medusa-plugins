import { z } from 'zod'
import { AmountSchema, SessionResultResponse, UnknownArraySchema } from './core'
import { getValidator } from './helpers'

const SessionResponseSchema = z.object({
  amount: AmountSchema,
})

const DataSchema = z.object({
  reference: z.string(),
  sessionResult: SessionResultResponse,
  paymentRefundResponses: UnknownArraySchema.optional(),
  sessionResponse: SessionResponseSchema,
})

const InputSchema = z.object({
  data: DataSchema,
  amount: z.any(),
})

export type RefundPaymentInput = z.infer<typeof InputSchema>

export const validateRefundPaymentInput =
  getValidator<RefundPaymentInput>(InputSchema)

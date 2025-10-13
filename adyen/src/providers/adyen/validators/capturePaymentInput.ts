import { z } from 'zod'
import { SessionResultResponseSchema, UnknownArraySchema } from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  sessionResultResponse: SessionResultResponseSchema,
  paymentCaptureResponses: UnknownArraySchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema,
})

export type CapturePaymentInput = z.infer<typeof InputSchema>

export const validateCapturePaymentInput =
  getValidator<CapturePaymentInput>(InputSchema)

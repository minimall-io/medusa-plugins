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
  sessionResultResponse: SessionResultResponseSchema,
  createCheckoutSessionResponse: CreateCheckoutSessionResponseSchema,
  paymentCaptureResponses: UnknownArraySchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema,
  context: PaymentProviderContextSchema.partial().optional(),
  amount: z.any().optional(),
})

export type CapturePaymentInput = z.infer<typeof InputSchema>

export const validateCapturePaymentInput =
  getValidator<CapturePaymentInput>(InputSchema)

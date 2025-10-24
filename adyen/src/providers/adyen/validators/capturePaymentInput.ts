import { z } from 'zod'
import { PaymentProviderContextSchema, PaymentProviderDataSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = PaymentProviderDataSchema.pick({
  reference: true,
  sessionResultResponse: true,
  createCheckoutSessionResponse: true,
  paymentCaptureResponses: true,
  paymentCaptureRequests: true,
})

const InputSchema = z.object({
  data: DataSchema.partial({
    paymentCaptureResponses: true,
    paymentCaptureRequests: true,
  }),
  context: PaymentProviderContextSchema.partial().optional(),
  amount: z.any().optional(),
})

export type CapturePaymentInput = z.infer<typeof InputSchema>

export const validateCapturePaymentInput =
  getValidator<CapturePaymentInput>(InputSchema)

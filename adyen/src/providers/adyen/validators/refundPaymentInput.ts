import { z } from 'zod'
import { PaymentProviderContextSchema, PaymentProviderDataSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = PaymentProviderDataSchema.pick({
  reference: true,
  createCheckoutSessionResponse: true,
  sessionResultResponse: true,
  paymentRefundResponses: true,
})

const InputSchema = z.object({
  data: DataSchema.partial({ paymentRefundResponses: true }),
  context: PaymentProviderContextSchema.partial().optional(),
  amount: z.any(),
})

export type RefundPaymentInput = z.infer<typeof InputSchema>

export const validateRefundPaymentInput =
  getValidator<RefundPaymentInput>(InputSchema)

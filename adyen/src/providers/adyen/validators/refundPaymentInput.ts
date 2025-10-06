import { z } from 'zod'
import { AmountSchema } from './amount'
import { getValidator } from './helpers'

const PaymentCaptureResponseSchema = z.object({
  amount: AmountSchema,
  pspReference: z.string(),
  reference: z.string(),
})

const DataSchema = z.object({
  paymentCaptureResponse: PaymentCaptureResponseSchema,
})

const InputSchema = z.object({
  data: DataSchema,
  amount: z.number(),
})

export type RefundPaymentInput = z.infer<typeof InputSchema>

export const validateRefundPaymentInput =
  getValidator<RefundPaymentInput>(InputSchema)

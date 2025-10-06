import { z } from 'zod'
import { AmountSchema } from './amount'
import { getValidator } from './helpers'

const PaymentResponseSchema = z.object({
  amount: AmountSchema,
  merchantReference: z.string(),
  pspReference: z.string(),
})

const DataSchema = z.object({
  paymentResponse: PaymentResponseSchema,
})

const InputSchema = z.object({
  data: DataSchema,
})

export type CapturePaymentInput = z.infer<typeof InputSchema>

export const validateCapturePaymentInput =
  getValidator<CapturePaymentInput>(InputSchema)

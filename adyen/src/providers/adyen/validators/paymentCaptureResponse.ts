import { z } from 'zod'
import { AmountSchema } from './amount'
import { getValidator } from './helpers'

export const PaymentCaptureResponseSchema = z.object({
  amount: AmountSchema,
  merchantAccount: z.string(),
  paymentPspReference: z.string(),
  pspReference: z.string(),
  reference: z.string(),
})

export type PaymentCaptureResponse = z.infer<
  typeof PaymentCaptureResponseSchema
>

export const validatePaymentCaptureResponse =
  getValidator<PaymentCaptureResponse>(PaymentCaptureResponseSchema)

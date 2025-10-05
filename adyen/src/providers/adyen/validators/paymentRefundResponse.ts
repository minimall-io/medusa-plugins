import { z } from 'zod'
import { AmountSchema } from './amount'
import { getValidator } from './helpers'

export const PaymentRefundResponseSchema = z.object({
  amount: AmountSchema,
  capturePspReference: z.string(),
  merchantAccount: z.string(),
  paymentPspReference: z.string(),
  pspReference: z.string(),
  reference: z.string(),
})

export type PaymentRefundResponse = z.infer<typeof PaymentRefundResponseSchema>

export const validatePaymentRefundResponse =
  getValidator<PaymentRefundResponse>(PaymentRefundResponseSchema)

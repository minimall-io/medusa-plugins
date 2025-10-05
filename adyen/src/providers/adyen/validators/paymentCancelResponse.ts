import { z } from 'zod'
import { getValidator } from './helpers'

export const PaymentCancelResponseSchema = z.object({
  merchantAccount: z.string(),
  paymentPspReference: z.string(),
  pspReference: z.string(),
  reference: z.string(),
})

export type PaymentCancelResponse = z.infer<typeof PaymentCancelResponseSchema>

export const validatePaymentCancelResponse =
  getValidator<PaymentCancelResponse>(PaymentCancelResponseSchema)

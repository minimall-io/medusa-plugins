import { z } from 'zod'
import { AmountSchema } from './amount'
import { getValidator } from './helpers'

export const PaymentResponseSchema = z.object({
  amount: AmountSchema,
  merchantReference: z.string(),
  pspReference: z.string(),
})

export type PaymentResponse = z.infer<typeof PaymentResponseSchema>

export const validatePaymentResponse = getValidator<PaymentResponse>(
  PaymentResponseSchema,
)

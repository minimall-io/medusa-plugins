import { z } from 'zod'
import { AmountSchema } from './amount'
import { getValidator } from './helpers'
import { AnyRecordSchema } from './primitives'

const PaymentMethodSchema = z.intersection(
  AnyRecordSchema,
  z.object({
    checkoutAttemptId: z.string().optional(),
  }),
)

export const PaymentRequestSchema = z.object({
  amount: AmountSchema,
  paymentMethod: PaymentMethodSchema,
})

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>

export const validatePaymentRequest =
  getValidator<PaymentRequest>(PaymentRequestSchema)

import { z } from 'zod'
import {
  AuthorizationSchema,
  CheckoutSessionSchema,
  PaymentModificationSchema,
  PaymentModificationsSchema,
  PaymentProviderContextSchema,
} from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  authorization: AuthorizationSchema,
  checkoutSession: CheckoutSessionSchema.pick({ amount: true }),
  reference: z.string(),
  refunds: PaymentModificationsSchema.optional(),
  request: PaymentModificationSchema.omit({ id: true }).optional(),
})

const InputSchema = z.object({
  amount: z.any(),
  context: PaymentProviderContextSchema.partial().optional(),
  data: DataSchema,
})

export type RefundPaymentInput = z.infer<typeof InputSchema>

export const validateRefundPaymentInput =
  getValidator<RefundPaymentInput>(InputSchema)

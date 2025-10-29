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
  reference: z.string(),
  checkoutSession: CheckoutSessionSchema,
  authorization: AuthorizationSchema,
  refunds: PaymentModificationsSchema.optional(),
  request: PaymentModificationSchema.omit({ id: true }).optional(),
})

const InputSchema = z.object({
  data: DataSchema,
  context: PaymentProviderContextSchema.partial().optional(),
  amount: z.any(),
})

export type RefundPaymentInput = z.infer<typeof InputSchema>

export const validateRefundPaymentInput =
  getValidator<RefundPaymentInput>(InputSchema)

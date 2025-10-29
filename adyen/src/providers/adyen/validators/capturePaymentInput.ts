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
  checkoutSession: CheckoutSessionSchema.pick({ amount: true }),
  authorization: AuthorizationSchema,
  captures: PaymentModificationsSchema.optional(),
  request: PaymentModificationSchema.omit({ id: true }).optional(),
})

const InputSchema = z.object({
  data: DataSchema,
  context: PaymentProviderContextSchema.partial().optional(),
  amount: z.any().optional(),
})

export type CapturePaymentInput = z.infer<typeof InputSchema>

export const validateCapturePaymentInput =
  getValidator<CapturePaymentInput>(InputSchema)

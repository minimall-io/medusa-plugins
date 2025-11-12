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
  captures: PaymentModificationsSchema.optional(),
  checkoutSession: CheckoutSessionSchema.pick({ amount: true }),
  reference: z.string(),
  request: PaymentModificationSchema.omit({ id: true }).optional(),
})

const InputSchema = z.object({
  amount: z.any().optional(),
  context: PaymentProviderContextSchema.partial().optional(),
  data: DataSchema,
})

export type CapturePaymentInput = z.infer<typeof InputSchema>

export const validateCapturePaymentInput =
  getValidator<CapturePaymentInput>(InputSchema)

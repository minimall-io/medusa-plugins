import type { z } from 'zod'
import { PaymentModificationSchema, PaymentModificationsSchema } from './core'
import { getValidator } from './helpers'

const CancellationSchema = PaymentModificationSchema.pick({
  id: true,
  pspReference: true,
  reference: true,
  status: true,
})

export type Cancellation = z.infer<typeof CancellationSchema>

export const validateCancellation =
  getValidator<Cancellation>(CancellationSchema)

export type Captures = z.infer<typeof PaymentModificationsSchema>

export const validateCaptures = getValidator<Captures>(
  PaymentModificationsSchema,
)

export type Refunds = z.infer<typeof PaymentModificationsSchema>

export const validateRefunds = getValidator<Refunds>(PaymentModificationsSchema)

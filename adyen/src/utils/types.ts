import type { z } from 'zod'
import type {
  OptionsSchema,
  PaymentModificationDataSchema,
  PaymentModificationSchema,
} from './schemas'

export type Options = z.infer<typeof OptionsSchema>
export type PaymentModification = z.infer<typeof PaymentModificationSchema>
export type PaymentModificationData = z.infer<
  typeof PaymentModificationDataSchema
>

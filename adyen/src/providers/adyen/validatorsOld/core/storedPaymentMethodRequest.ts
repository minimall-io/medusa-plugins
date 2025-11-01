import { z } from 'zod'
import {
  PaymentMethodToStoreSchema,
  RecurringProcessingModelEnumSchema,
} from '.'

export const StoredPaymentMethodRequestSchema = z.object({
  merchantAccount: z.string(),
  paymentMethod: PaymentMethodToStoreSchema,
  recurringProcessingModel: RecurringProcessingModelEnumSchema,
  shopperEmail: z.string().optional(),
  shopperIP: z.string().optional(),
  shopperReference: z.string(),
})

import { z } from 'zod'
import { PaymentMethodToStoreSchema } from './core'
import { getValidator } from './helpers'
import { UnknownArraySchema } from './primitives'

const StoredPaymentMethodRequestSchema = z.object({
  paymentMethod: PaymentMethodToStoreSchema,
  shopperReference: z.string(),
  shopperEmail: z.string().optional(),
  shopperIP: z.string().optional(),
})

const DataSchema = z.object({
  storedPaymentMethodRequest: StoredPaymentMethodRequestSchema,
  storedPaymentMethods: UnknownArraySchema.optional(),
})

const InputSchema = z.object({
  data: DataSchema,
})

export type SavePaymentMethodInput = z.infer<typeof InputSchema>

export const validateSavePaymentMethodInput =
  getValidator<SavePaymentMethodInput>(InputSchema)

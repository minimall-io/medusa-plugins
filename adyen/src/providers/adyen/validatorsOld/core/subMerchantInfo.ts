import { z } from 'zod'
import { AmountSchema, BillingAddressSchema } from '.'

export const SubMerchantInfoSchema = z.object({
  address: BillingAddressSchema.optional().nullable(),
  amount: AmountSchema.optional().nullable(),
  email: z.string().optional(),
  id: z.string().optional(),
  mcc: z.string().optional(),
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  registeredSince: z.string().optional(),
  taxId: z.string().optional(),
  url: z.string().optional(),
})

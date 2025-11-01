import { z } from 'zod'

export const SubMerchantSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  mcc: z.string().optional(),
  name: z.string().optional(),
  taxId: z.string().optional(),
})

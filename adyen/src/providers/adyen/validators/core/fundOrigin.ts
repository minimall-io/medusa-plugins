import { z } from 'zod'
import { AddressSchema, NameSchema } from '.'

export const FundOriginSchema = z.object({
  billingAddress: AddressSchema.optional().nullable(),
  shopperEmail: z.string().optional(),
  shopperName: NameSchema.optional().nullable(),
  telephoneNumber: z.string().optional(),
  walletIdentifier: z.string().optional(),
})

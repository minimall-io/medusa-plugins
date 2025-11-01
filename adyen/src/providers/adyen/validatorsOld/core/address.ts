import { z } from 'zod'

export const AddressSchema = z.object({
  city: z.string(),
  country: z.string(),
  houseNumberOrName: z.string(),
  postalCode: z.string(),
  stateOrProvince: z.string().optional(),
  street: z.string(),
})

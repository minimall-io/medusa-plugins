import { z } from 'zod'

export const EncryptedOrderDataSchema = z.object({
  orderData: z.string(),
  pspReference: z.string(),
})

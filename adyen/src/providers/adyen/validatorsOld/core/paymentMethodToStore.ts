import { z } from 'zod'

export const PaymentMethodToStoreSchema = z.object({
  brand: z.string().optional(),
  cvc: z.string().optional(),
  encryptedCard: z.string().optional(),
  encryptedCardNumber: z.string().optional(),
  encryptedExpiryMonth: z.string().optional(),
  encryptedExpiryYear: z.string().optional(),
  encryptedSecurityCode: z.string().optional(),
  expiryMonth: z.string().optional(),
  expiryYear: z.string().optional(),
  holderName: z.string().optional(),
  number: z.string().optional(),
  type: z.string().optional(),
})

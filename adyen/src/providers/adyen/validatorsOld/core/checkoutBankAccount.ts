import { z } from 'zod'
import { CheckoutBankAccountTypeEnumSchema } from '.'

export const CheckoutBankAccountSchema = z.object({
  accountType: CheckoutBankAccountTypeEnumSchema.optional(),
  bankAccountNumber: z.string().optional(),
  bankCity: z.string().optional(),
  bankLocationId: z.string().optional(),
  bankName: z.string().optional(),
  bic: z.string().optional(),
  countryCode: z.string().optional(),
  iban: z.string().optional(),
  ownerName: z.string().optional(),
  taxId: z.string().optional(),
})

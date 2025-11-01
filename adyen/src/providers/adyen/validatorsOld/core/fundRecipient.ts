import { z } from 'zod'
import {
  AddressSchema,
  CardDetailsSchema,
  NameSchema,
  SubMerchantSchema,
  WalletPurposeEnumSchema,
} from '.'

export const FundRecipientSchema = z.object({
  IBAN: z.string().optional(),
  billingAddress: AddressSchema.optional().nullable(),
  paymentMethod: CardDetailsSchema.optional().nullable(),
  shopperEmail: z.string().optional(),
  shopperName: NameSchema.optional().nullable(),
  shopperReference: z.string().optional(),
  storedPaymentMethodId: z.string().optional(),
  subMerchant: SubMerchantSchema.optional().nullable(),
  telephoneNumber: z.string().optional(),
  walletIdentifier: z.string().optional(),
  walletOwnerTaxId: z.string().optional(),
  walletPurpose: WalletPurposeEnumSchema.optional(),
})

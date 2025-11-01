import { z } from 'zod'
import {
  AmountSchema,
  BrowserInfoSchema,
  ChannelEnumSchema,
  EncryptedOrderDataSchema,
  StoreFiltrationModeEnumSchema,
  StringArraySchema,
  StringRecordSchema,
} from '.'

export const PaymentMethodsRequestSchema = z.object({
  additionalData: StringRecordSchema.optional(),
  allowedPaymentMethods: StringArraySchema.optional(),
  amount: AmountSchema.optional().nullable(),
  blockedPaymentMethods: StringArraySchema.optional(),
  browserInfo: BrowserInfoSchema.optional().nullable(),
  channel: ChannelEnumSchema.optional(),
  countryCode: z.string().optional(),
  merchantAccount: z.string(),
  order: EncryptedOrderDataSchema.optional().nullable(),
  shopperConversionId: z.string().optional(),
  shopperEmail: z.string().optional(),
  shopperIP: z.string().optional(),
  shopperLocale: z.string().optional(),
  shopperReference: z.string().optional(),
  splitCardFundingSources: z.boolean().optional(),
  store: z.string().optional(),
  storeFiltrationMode: StoreFiltrationModeEnumSchema.optional(),
  telephoneNumber: z.string().optional(),
})

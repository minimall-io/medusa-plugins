import { Types } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import { z } from 'zod'
import {
  AnyRecordSchema,
  StringArraySchema,
  StringRecordSchema,
} from './primitives'

export const EnvironmentEnumSchema = z.nativeEnum(EnvironmentEnum)

export const ChannelEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.ChannelEnum,
)

export const RecurringProcessingModelEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.RecurringProcessingModelEnum,
)

export const ShopperInteractionEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.ShopperInteractionEnum,
)

export const StoreFiltrationModeEnumSchema = z.nativeEnum(
  Types.checkout.PaymentMethodsRequest.StoreFiltrationModeEnum,
)

export const AmountSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  value: z.number(),
})

export const OrderSchema = z.object({
  orderData: z.string(),
  pspReference: z.string(),
})

export const BrowserInfoSchema = z.object({
  acceptHeader: z.string(),
  colorDepth: z.number(),
  javaEnabled: z.boolean(),
  javaScriptEnabled: z.boolean().optional(),
  language: z.string(),
  screenHeight: z.number(),
  screenWidth: z.number(),
  timeZoneOffset: z.number(),
  userAgent: z.string(),
})

export const PaymentMethodSchema = z.intersection(
  AnyRecordSchema,
  z.object({
    checkoutAttemptId: z.string().optional(),
  }),
)

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

export const SharedPaymentRequestSchema = z.object({
  additionalData: StringRecordSchema.optional(),
  browserInfo: BrowserInfoSchema.optional().nullable(),
  channel: ChannelEnumSchema.optional(),
  countryCode: z.string().optional(),
  order: OrderSchema.optional().nullable(),
  shopperConversionId: z.string().optional(),
  shopperEmail: z.string().optional(),
  shopperIP: z.string().optional(),
  shopperLocale: z.string().optional(),
  shopperReference: z.string().optional(),
  store: z.string().optional(),
  telephoneNumber: z.string().optional(),
})

export const PaymentMethodsRequestSchema = SharedPaymentRequestSchema.extend({
  allowedPaymentMethods: StringArraySchema.optional(),
  amount: AmountSchema.optional().nullable(),
  blockedPaymentMethods: StringArraySchema.optional(),
  splitCardFundingSources: z.boolean().optional(),
  storeFiltrationMode: StoreFiltrationModeEnumSchema.optional(),
})

export const PaymentRequestSchema = SharedPaymentRequestSchema.extend({
  amount: AmountSchema,
  paymentMethod: PaymentMethodSchema,
  storePaymentMethod: z.boolean().optional(),
})

export const PaymentResponseSchema = z.object({
  amount: AmountSchema,
  pspReference: z.string(),
})

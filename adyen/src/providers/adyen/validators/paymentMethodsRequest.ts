import { Types } from '@adyen/api-library'
import { z } from 'zod'
import { AmountSchema } from './amount'
import { getValidator } from './helpers'
import { StringArraySchema, StringRecordSchema } from './primitives'

const OrderSchema = z.object({
  orderData: z.string(),
  pspReference: z.string(),
})

const BrowserInfoSchema = z.object({
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

const ChannelEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.ChannelEnum,
)

const StoreFiltrationModeEnumSchema = z.nativeEnum(
  Types.checkout.PaymentMethodsRequest.StoreFiltrationModeEnum,
)

export const PaymentMethodsRequestSchema = z.object({
  additionalData: StringRecordSchema.optional(),
  allowedPaymentMethods: StringArraySchema.optional(),
  amount: AmountSchema.optional().nullable(),
  blockedPaymentMethods: StringArraySchema.optional(),
  browserInfo: BrowserInfoSchema.optional().nullable(),
  channel: ChannelEnumSchema.optional(),
  countryCode: z.string().optional(),
  order: OrderSchema.optional().nullable(),
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

export type PaymentMethodsRequest = z.infer<typeof PaymentMethodsRequestSchema>

export const validatePaymentMethodsRequest =
  getValidator<PaymentMethodsRequest>(PaymentMethodsRequestSchema)

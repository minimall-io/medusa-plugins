import { Types } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import { MedusaError } from '@medusajs/framework/utils'
import { z } from 'zod'

// TODO: Remove after finishing the plugin. Used for easier type reference.
type T = Types.checkout.PaymentRefundResponse

const getValidator =
  <T = any>(schema: z.ZodSchema) =>
  (data: unknown, errorMessage?: string): T => {
    try {
      const validatedData = schema.parse(data)
      return validatedData
    } catch (error) {
      if (errorMessage) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
      } else if (error instanceof z.ZodError) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
      } else {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, error)
      }
    }
  }

const StringArraySchema = z.array(z.string())

const StringRecordSchema = z.record(z.string(), z.string())

const AnyRecordSchema = z.record(z.string(), z.any())

const UnknownRecordSchema = z.record(z.string(), z.unknown())

const AddressDTOSchema = z.object({
  id: z.string().optional(),
  address_1: z.string(),
  address_2: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  country_code: z.string(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  metadata: UnknownRecordSchema.optional().nullable(),
  created_at: z.union([z.string(), z.date()]).optional(),
  updated_at: z.union([z.string(), z.date()]).optional(),
  deleted_at: z.union([z.string(), z.date()]).optional().nullable(),
})

const PaymentAccountHolderDTOSchema = z.object({
  data: UnknownRecordSchema,
})

const PaymentCustomerDTOSchema = z.object({
  id: z.string(),
  email: z.string(),
  company_name: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billing_address: AddressDTOSchema.partial().optional().nullable(),
})

const PaymentProviderContextSchema = z.object({
  account_holder: PaymentAccountHolderDTOSchema.optional(),
  customer: PaymentCustomerDTOSchema.optional(),
  idempotency_key: z.string().optional(),
})

const EnvironmentEnumSchema = z.nativeEnum(EnvironmentEnum)

const ChannelEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.ChannelEnum,
)

const StoreFiltrationModeEnumSchema = z.nativeEnum(
  Types.checkout.PaymentMethodsRequest.StoreFiltrationModeEnum,
)

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

const PaymentMethodSchema = z.intersection(
  AnyRecordSchema,
  z.object({
    checkoutAttemptId: z.string().optional(),
  }),
)

const AmountSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  value: z.number(),
})

const PaymentResponseSchema = z.object({
  amount: AmountSchema,
  merchantReference: z.string(),
  pspReference: z.string(),
})

const PaymentCaptureResponseSchema = z.object({
  amount: AmountSchema,
  merchantAccount: z.string(),
  paymentPspReference: z.string(),
  pspReference: z.string(),
  reference: z.string(),
})

const PaymentCancelResponseSchema = z.object({
  merchantAccount: z.string(),
  paymentPspReference: z.string(),
  pspReference: z.string(),
  reference: z.string(),
})

const PaymentRefundResponseSchema = z.object({
  amount: AmountSchema,
  capturePspReference: z.string(),
  merchantAccount: z.string(),
  paymentPspReference: z.string(),
  pspReference: z.string(),
  reference: z.string(),
})

const PaymentMethodsRequestSchema = z.object({
  additionalData: StringRecordSchema.optional(),
  allowedPaymentMethods: StringArraySchema.optional(),
  amount: AmountSchema.optional().nullable(),
  blockedPaymentMethods: StringArraySchema.optional(),
  browserInfo: BrowserInfoSchema.optional().nullable(),
  channel: ChannelEnumSchema.optional(),
  countryCode: z.string().optional(),
  merchantAccount: z.string(),
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

const PaymentRequestSchema = z.object({
  amount: AmountSchema,
  paymentMethod: PaymentMethodSchema,
  merchantAccount: z.string(),
  reference: z.string(),
  returnUrl: z.string(),
})

const TransientDataSchema = z.object({
  sessionId: z.string(),
  paymentResponse: PaymentResponseSchema.nullable(),
  paymentCaptureResponse: PaymentCaptureResponseSchema.nullable(),
  paymentCancelResponse: PaymentCancelResponseSchema.nullable(),
  paymentRefundResponse: PaymentRefundResponseSchema.nullable(),
})

const DataSchema = TransientDataSchema.extend({
  paymentRequest: z
    .union([
      PaymentRequestSchema.partial(),
      PaymentMethodsRequestSchema.partial(),
    ])
    .optional(),
  ready: z.boolean().optional(),
  session_id: z.string().optional(),
}).partial()

const OptionsSchema = z.object({
  apiKey: z.string(),
  hmacKey: z.string(),
  merchantAccount: z.string(),
  liveEndpointUrlPrefix: z.string(),
  returnUrlPrefix: z.string(),
  environment: EnvironmentEnumSchema.optional(),
})

export type PaymentProviderContext = z.infer<
  typeof PaymentProviderContextSchema
>
export type Amount = z.infer<typeof AmountSchema>
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>
export type PaymentCaptureResponse = z.infer<
  typeof PaymentCaptureResponseSchema
>
export type PaymentCancelResponse = z.infer<typeof PaymentCancelResponseSchema>
export type PaymentRefundResponse = z.infer<typeof PaymentRefundResponseSchema>
export type PaymentMethodsRequest = z.infer<typeof PaymentMethodsRequestSchema>
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>

export type TransientData = z.infer<typeof TransientDataSchema>
export type Data = z.infer<typeof DataSchema>
export type Options = z.infer<typeof OptionsSchema>

export const validatePaymentProviderContext =
  getValidator<PaymentProviderContext>(PaymentProviderContextSchema)

export const validateAmount = getValidator<Amount>(AmountSchema)

export const validatePaymentResponse = getValidator<PaymentResponse>(
  PaymentResponseSchema,
)

export const validatePaymentCaptureResponse =
  getValidator<PaymentCaptureResponse>(PaymentCaptureResponseSchema)

export const validatePaymentCancelResponse =
  getValidator<PaymentCancelResponse>(PaymentCancelResponseSchema)

export const validatePaymentRefundResponse =
  getValidator<PaymentRefundResponse>(PaymentRefundResponseSchema)

export const validatePaymentMethodsRequest =
  getValidator<PaymentMethodsRequest>(PaymentMethodsRequestSchema)

export const validatePaymentRequest =
  getValidator<PaymentRequest>(PaymentRequestSchema)

export const validateTransientData =
  getValidator<TransientData>(TransientDataSchema)

export const validateData = getValidator<Data>(DataSchema)

export const validateOptions = getValidator<Options>(OptionsSchema)

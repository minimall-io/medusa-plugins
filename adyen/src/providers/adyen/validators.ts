import { MedusaError } from '@medusajs/framework/utils'
import { z } from 'zod'

const EnvironmentEnumSchema = z.enum(['LIVE', 'TEST'])

const ChannelEnumSchema = z.enum(['iOS', 'Android', 'Web'])

const StoreFiltrationModeEnumSchema = z.enum([
  'exclusive',
  'inclusive',
  'skipFilter',
])

const AdditionalDataSchema = z.record(z.string(), z.string())

const PaymentMethodsSchema = z.array(z.string())

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
  z.record(z.string(), z.any()),
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

const PaymentMethodsRequestSchema = z.object({
  additionalData: AdditionalDataSchema.optional(),
  allowedPaymentMethods: PaymentMethodsSchema.optional(),
  amount: AmountSchema.optional().nullable(),
  blockedPaymentMethods: PaymentMethodsSchema.optional(),
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
})

const DataSchema = TransientDataSchema.extend({
  paymentRequest: PaymentRequestSchema.optional(),
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

export type Amount = z.infer<typeof AmountSchema>
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>
export type PaymentCaptureResponse = z.infer<
  typeof PaymentCaptureResponseSchema
>
export type Options = z.infer<typeof OptionsSchema>
export type TransientData = z.infer<typeof TransientDataSchema>
export type Data = z.infer<typeof DataSchema>

const dataValidator =
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

export const validateAmount = dataValidator<Amount>(AmountSchema)

export const validatePaymentMethodsRequest = dataValidator(
  PaymentMethodsRequestSchema,
)

export const validatePaymentRequest = dataValidator(PaymentRequestSchema)

export const validatePaymentResponse = dataValidator<PaymentResponse>(
  PaymentResponseSchema,
)

export const validatePaymentCaptureResponse =
  dataValidator<PaymentCaptureResponse>(PaymentCaptureResponseSchema)

export const validateTransientData =
  dataValidator<TransientData>(TransientDataSchema)

export const validateData = dataValidator<Data>(DataSchema)

export const validateOptions = dataValidator<Options>(OptionsSchema)

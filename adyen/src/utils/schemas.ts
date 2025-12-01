import { Types } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import { z } from 'zod'

export const EnvironmentEnumSchema = z.nativeEnum(EnvironmentEnum)

export const ShopperInteractionEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.ShopperInteractionEnum,
)

export const RecurringProcessingModelEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.RecurringProcessingModelEnum,
)

export const OptionsSchema = z.object({
  apiKey: z.string(),
  environment: EnvironmentEnumSchema.optional(),
  hmacKey: z.string(),
  liveEndpointUrlPrefix: z.string(),
  merchantAccount: z.string(),
  recurringProcessingModel: RecurringProcessingModelEnumSchema.optional(),
  shopperInteraction: ShopperInteractionEnumSchema.optional(),
})

export const AmountSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  value: z.number(),
})

export const EventNameEnumSchema = z.enum([
  'AUTHORISATION',
  'CANCELLATION',
  'CAPTURE',
  'REFUND',
])
export const EventStatusEnumSchema = z.enum([
  'REQUESTED',
  'FAILED',
  'SUCCEEDED',
])

export const EventSchema = z.object({
  amount: AmountSchema,
  date: z.string(),
  id: z.string(),
  merchantReference: z.string(),
  name: EventNameEnumSchema,
  notes: z.string().optional(),
  providerReference: z.string(),
  status: EventStatusEnumSchema,
})

export const DataSchema = z.object({
  amount: AmountSchema,
  events: z.array(EventSchema).optional(),
  reference: z.string(),
  webhook: z.boolean().optional(),
})

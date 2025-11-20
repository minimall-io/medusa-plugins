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
  recurringProcessingModel: RecurringProcessingModelEnumSchema,
  returnUrlPrefix: z.string(),
  shopperInteraction: ShopperInteractionEnumSchema,
})

export const AmountSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  value: z.number(),
})

export const EventSchema = z.object({
  amount: AmountSchema,
  date: z.string(),
  id: z.string().optional(),
  merchantReference: z.string(),
  name: z.string(),
  notes: z.string().optional(),
  providerReference: z.string(),
  status: z.string(),
})

export const DataSchema = z.object({
  amount: AmountSchema,
  events: z.array(EventSchema).optional(),
  reference: z.string(),
  webhook: z.boolean().optional(),
})

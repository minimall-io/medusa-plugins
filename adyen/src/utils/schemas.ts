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

export const PaymentModificationSchema = z.object({
  amount: AmountSchema.optional(),
  id: z.string().optional(),
  pspReference: z.string(),
  reference: z.string(),
  status: z.string(),
})

export const PaymentModificationDataSchema = z.object({
  amount: AmountSchema,
  authorization: PaymentModificationSchema.pick({
    amount: true,
    pspReference: true,
  }),
  cancellation: PaymentModificationSchema.optional(),
  captures: z.array(PaymentModificationSchema).optional(),
  reference: z.string(),
  refunds: z.array(PaymentModificationSchema).optional(),
  webhook: z.boolean().optional(),
})

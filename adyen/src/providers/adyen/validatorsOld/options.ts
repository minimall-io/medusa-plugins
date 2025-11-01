import { z } from 'zod'
import {
  EnvironmentEnumSchema,
  RecurringProcessingModelEnumSchema,
  ShopperInteractionEnumSchema,
  StorePaymentMethodModeEnumSchema,
} from './core'
import { getValidator } from './helpers'

export const OptionsSchema = z.object({
  apiKey: z.string(),
  hmacKey: z.string(),
  merchantAccount: z.string(),
  liveEndpointUrlPrefix: z.string(),
  returnUrlPrefix: z.string(),
  environment: EnvironmentEnumSchema.optional(),
  shopperInteraction: ShopperInteractionEnumSchema,
  recurringProcessingModel: RecurringProcessingModelEnumSchema,
  storePaymentMethodMode: StorePaymentMethodModeEnumSchema,
})

export type Options = z.infer<typeof OptionsSchema>

export const validateOptions = getValidator<Options>(OptionsSchema)

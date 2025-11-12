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
  environment: EnvironmentEnumSchema.optional(),
  hmacKey: z.string(),
  liveEndpointUrlPrefix: z.string(),
  merchantAccount: z.string(),
  recurringProcessingModel: RecurringProcessingModelEnumSchema,
  returnUrlPrefix: z.string(),
  shopperInteraction: ShopperInteractionEnumSchema,
  storePaymentMethodMode: StorePaymentMethodModeEnumSchema,
})

export type Options = z.infer<typeof OptionsSchema>

export const validateOptions = getValidator<Options>(OptionsSchema)

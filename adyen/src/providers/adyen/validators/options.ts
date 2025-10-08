import { z } from 'zod'
import {
  ChannelEnumSchema,
  EnvironmentEnumSchema,
  RecurringProcessingModelEnumSchema,
  ShopperInteractionEnumSchema,
} from './core'
import { getValidator } from './helpers'

export const OptionsSchema = z.object({
  apiKey: z.string(),
  hmacKey: z.string(),
  merchantAccount: z.string(),
  liveEndpointUrlPrefix: z.string(),
  returnUrlPrefix: z.string(),
  environment: EnvironmentEnumSchema.optional(),
  channel: ChannelEnumSchema.optional(),
  shopperInteraction: ShopperInteractionEnumSchema.optional(),
  recurringProcessingModel: RecurringProcessingModelEnumSchema.optional(),
})

export type Options = z.infer<typeof OptionsSchema>

export const validateOptions = getValidator<Options>(OptionsSchema)

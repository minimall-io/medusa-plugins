import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import { z } from 'zod'
import { getValidator } from './helpers'

export const EnvironmentEnumSchema = z.nativeEnum(EnvironmentEnum)

export const OptionsSchema = z.object({
  apiKey: z.string(),
  hmacKey: z.string(),
  merchantAccount: z.string(),
  liveEndpointUrlPrefix: z.string(),
  returnUrlPrefix: z.string(),
  environment: EnvironmentEnumSchema.optional(),
})

export type Options = z.infer<typeof OptionsSchema>

export const validateOptions = getValidator<Options>(OptionsSchema)

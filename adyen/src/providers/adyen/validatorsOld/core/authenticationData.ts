import { z } from 'zod'
import { AttemptAuthenticationEnumSchema, ThreeDSRequestDataSchema } from '.'

export const AuthenticationDataSchema = z.object({
  attemptAuthentication: AttemptAuthenticationEnumSchema.optional(),
  authenticationOnly: z.boolean().optional(),
  threeDSRequestData: ThreeDSRequestDataSchema.optional().nullable(),
})

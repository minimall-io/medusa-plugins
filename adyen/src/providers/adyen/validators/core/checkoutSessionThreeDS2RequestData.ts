import { z } from 'zod'
import { PhoneSchema, ThreeDSRequestorChallengeIndEnumSchema } from '.'

export const CheckoutSessionThreeDS2RequestDataSchema = z.object({
  homePhone: PhoneSchema.optional().nullable(),
  mobilePhone: PhoneSchema.optional().nullable(),
  threeDSRequestorChallengeInd:
    ThreeDSRequestorChallengeIndEnumSchema.optional(),
  workPhone: PhoneSchema.optional().nullable(),
})

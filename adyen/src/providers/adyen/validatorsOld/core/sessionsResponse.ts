import { z } from 'zod'
import { PaymentResponseResultCodeEnumSchema } from '.'

export const SessionsResponseSchema = z.object({
  sessionId: z.string(),
  sessionData: z.string(),
  sessionResult: z.string(),
  resultCode: PaymentResponseResultCodeEnumSchema,
})

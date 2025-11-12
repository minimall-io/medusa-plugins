import { z } from 'zod'
import { PaymentResponseResultCodeEnumSchema } from '.'

export const SessionsResponseSchema = z.object({
  resultCode: PaymentResponseResultCodeEnumSchema,
  sessionData: z.string(),
  sessionId: z.string(),
  sessionResult: z.string(),
})

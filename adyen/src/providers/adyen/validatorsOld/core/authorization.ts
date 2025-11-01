import { z } from 'zod'
import { PaymentSchema, StatusEnumSchema, StringRecordSchema } from '.'

export const AuthorizationSchema = z.object({
  additionalData: StringRecordSchema.optional(),
  id: z.string().optional(),
  payments: z.array(PaymentSchema).optional(),
  reference: z.string().optional(),
  status: StatusEnumSchema.optional(),
})

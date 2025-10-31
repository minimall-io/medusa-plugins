import { z } from 'zod'
import { UnknownRecordSchema } from '.'

export const EnhancedSchemeDataSchema = z.object({
  airline: UnknownRecordSchema.optional().nullable(),
})

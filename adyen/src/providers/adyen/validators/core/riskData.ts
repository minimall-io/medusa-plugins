import { z } from 'zod'
import { StringRecordSchema } from '.'

export const RiskDataSchema = z.object({
  clientData: z.string().optional(),
  customFields: StringRecordSchema.optional(),
  fraudOffset: z.number().optional(),
  profileReference: z.string().optional(),
})

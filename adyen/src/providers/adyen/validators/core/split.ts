import { z } from 'zod'
import { SplitAmountSchema, SplitTypeEnumSchema } from '.'

export const SplitSchema = z.object({
  account: z.string().optional(),
  amount: SplitAmountSchema.optional().nullable(),
  description: z.string().optional(),
  reference: z.string().optional(),
  type: SplitTypeEnumSchema,
})

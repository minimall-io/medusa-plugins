import { z } from 'zod'

export const SplitAmountSchema = z.object({
  currency: z.string().length(3).toUpperCase().optional(),
  value: z.number(),
})

import { z } from 'zod'

export const AmountSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  value: z.number(),
})

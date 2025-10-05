import { z } from 'zod'
import { getValidator } from './helpers'

export const AmountSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  value: z.number(),
})

export type Amount = z.infer<typeof AmountSchema>

export const validateAmount = getValidator<Amount>(AmountSchema)

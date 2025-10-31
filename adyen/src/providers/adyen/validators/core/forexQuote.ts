import { z } from 'zod'
import { AmountSchema } from '.'

export const ForexQuoteSchema = z.object({
  account: z.string().optional(),
  accountType: z.string().optional(),
  baseAmount: AmountSchema.optional().nullable(),
  basePoints: z.number(),
  buy: AmountSchema.optional().nullable(),
  interbank: AmountSchema.optional().nullable(),
  reference: z.string().optional(),
  sell: AmountSchema.optional().nullable(),
  signature: z.string().optional(),
  source: z.string().optional(),
  type: z.string().optional(),
  validTill: z.date(),
})

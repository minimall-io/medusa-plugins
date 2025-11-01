import { z } from 'zod'

export const SurchargeSchema = z.object({
  value: z.number(),
})

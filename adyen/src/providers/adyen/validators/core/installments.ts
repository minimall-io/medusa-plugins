import { z } from 'zod'
import { PlanEnumSchema } from '.'

export const InstallmentsSchema = z.object({
  extra: z.number().optional(),
  plan: PlanEnumSchema.optional(),
  value: z.number(),
})

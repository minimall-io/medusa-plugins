import { z } from 'zod'
import { NumberArraySchema, PlanEnumSchema } from '.'

export const CheckoutSessionInstallmentOptionSchema = z.object({
  plans: z.array(PlanEnumSchema).optional(),
  preselectedValue: z.number().optional(),
  values: NumberArraySchema.optional(),
})

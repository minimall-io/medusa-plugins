import { z } from 'zod'
import { BehaviorEnumSchema } from '.'

export const PlatformChargebackLogicSchema = z.object({
  behavior: BehaviorEnumSchema.optional(),
  costAllocationAccount: z.string().optional(),
  targetAccount: z.string().optional(),
})

import { z } from 'zod'
import {
  AmountRuleEnumSchema,
  BillingAttemptsRuleEnumSchema,
  FrequencyEnumSchema,
} from '.'

export const MandateSchema = z.object({
  amount: z.string(),
  amountRule: AmountRuleEnumSchema.optional(),
  billingAttemptsRule: BillingAttemptsRuleEnumSchema.optional(),
  billingDay: z.string().optional(),
  count: z.string().optional(),
  endsAt: z.string(),
  frequency: FrequencyEnumSchema,
  remarks: z.string().optional(),
  startsAt: z.string().optional(),
})

import { z } from 'zod'

export const UpdatePaymentSessionSchema = z.object({
  data: z.record(z.string(), z.unknown()),
})

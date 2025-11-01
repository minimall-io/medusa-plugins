import { z } from 'zod'

export const CreatePaymentMethodsSchema = z.object({
  data: z.record(z.string(), z.unknown()),
})

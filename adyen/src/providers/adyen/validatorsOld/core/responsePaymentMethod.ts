import { z } from 'zod'

export const ResponsePaymentMethodSchema = z.object({
  brand: z.string().optional(),
  type: z.string().optional(),
})

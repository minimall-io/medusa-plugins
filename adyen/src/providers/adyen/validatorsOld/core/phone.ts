import { z } from 'zod'

export const PhoneSchema = z.object({
  cc: z.string().optional(),
  subscriber: z.string().optional(),
})

import { z } from 'zod'

export const NameSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
})

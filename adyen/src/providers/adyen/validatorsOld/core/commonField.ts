import { z } from 'zod'

export const CommonFieldSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
})

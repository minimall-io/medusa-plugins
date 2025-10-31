import { z } from 'zod'

export const ExternalPlatformSchema = z.object({
  integrator: z.string().optional(),
  name: z.string().optional(),
  version: z.string().optional(),
})

import { z } from 'zod'

export const CompanySchema = z.object({
  homepage: z.string().optional(),
  name: z.string().optional(),
  registrationNumber: z.string().optional(),
  registryLocation: z.string().optional(),
  taxId: z.string().optional(),
  type: z.string().optional(),
})

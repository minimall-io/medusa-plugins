import { z } from 'zod'

export const MerchantDeviceSchema = z.object({
  os: z.string().optional(),
  osVersion: z.string().optional(),
  reference: z.string().optional(),
})

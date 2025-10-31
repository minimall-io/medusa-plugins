import { z } from 'zod'

export const ShopperInteractionDeviceSchema = z.object({
  locale: z.string().optional(),
  os: z.string().optional(),
  osVersion: z.string().optional(),
})

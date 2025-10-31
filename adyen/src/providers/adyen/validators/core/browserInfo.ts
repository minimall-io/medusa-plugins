import { z } from 'zod'

export const BrowserInfoSchema = z.object({
  acceptHeader: z.string(),
  colorDepth: z.number(),
  javaEnabled: z.boolean(),
  javaScriptEnabled: z.boolean().optional(),
  language: z.string(),
  screenHeight: z.number(),
  screenWidth: z.number(),
  timeZoneOffset: z.number(),
  userAgent: z.string(),
})

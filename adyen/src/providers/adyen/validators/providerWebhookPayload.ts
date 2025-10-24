import { z } from 'zod'
import { getValidator } from './helpers'

const NotificationItemSchema = z.object({
  NotificationRequestItem: z.unknown(),
})

const NotificationSchema = z.object({
  live: z.string(),
  notificationItems: z.array(NotificationItemSchema),
})

const InputSchema = z.object({
  data: NotificationSchema,
})

export type ProviderWebhookPayload = z.infer<typeof InputSchema>

export const validateProviderWebhookPayload =
  getValidator<ProviderWebhookPayload>(InputSchema)

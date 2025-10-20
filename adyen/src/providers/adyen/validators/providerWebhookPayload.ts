import { z } from 'zod'
import {
  AmountSchema,
  EventCodeEnumSchema,
  OperationsEnumSchema,
  OptionalStringRecordSchema,
  SuccessEnumSchema,
} from './core'
import { getValidator } from './helpers'

const NotificationRequestItemSchema = z.object({
  additionalData: OptionalStringRecordSchema.optional(),
  amount: AmountSchema.partial(),
  pspReference: z.string(),
  eventCode: EventCodeEnumSchema,
  eventDate: z.string(),
  merchantAccountCode: z.string(),
  operations: z.array(OperationsEnumSchema).optional(),
  merchantReference: z.string(),
  originalReference: z.string().optional(),
  paymentMethod: z.string().optional(),
  reason: z.string().optional(),
  success: SuccessEnumSchema,
})

const NotificationItemSchema = z.object({
  NotificationRequestItem: NotificationRequestItemSchema,
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

import type { z } from 'zod'
import type {
  DataSchema,
  EventNameEnumSchema,
  EventSchema,
  EventStatusEnumSchema,
  OptionsSchema,
} from './schemas'

export type Data = z.infer<typeof DataSchema>
export type Event = z.infer<typeof EventSchema>
export type Options = z.infer<typeof OptionsSchema>
export type EventNameEnum = z.infer<typeof EventNameEnumSchema>
export type EventStatusEnum = z.infer<typeof EventStatusEnumSchema>

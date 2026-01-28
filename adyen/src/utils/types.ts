import type { z } from 'zod'
import type {
  DataSchema,
  EventNameEnumSchema,
  EventSchema,
  EventStatusEnumSchema,
  ExtendedDataSchema,
  OptionsSchema,
  RawDataSchema,
} from './schemas'

export type Data = z.infer<typeof DataSchema>
export type EventNameEnum = z.infer<typeof EventNameEnumSchema>
export type Event = z.infer<typeof EventSchema>
export type EventStatusEnum = z.infer<typeof EventStatusEnumSchema>
export type ExtendedData = z.infer<typeof ExtendedDataSchema>
export type Options = z.infer<typeof OptionsSchema>
export type RawData = z.infer<typeof RawDataSchema>

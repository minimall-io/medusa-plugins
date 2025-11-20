import type { z } from 'zod'
import type { DataSchema, EventSchema, OptionsSchema } from './schemas'

export type Data = z.infer<typeof DataSchema>
export type Event = z.infer<typeof EventSchema>
export type Options = z.infer<typeof OptionsSchema>

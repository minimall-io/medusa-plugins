import { MedusaError } from '@medusajs/framework/utils'
import { z } from 'zod'
import { DataSchema, EventSchema, OptionsSchema } from './schemas'
import type { Data, Event, Options } from './types'

export const getValidator =
  <T>(schema: z.ZodSchema) =>
  (data: unknown, errorMessage?: string): T => {
    try {
      const validatedData = schema.parse(data)
      return validatedData
    } catch (error) {
      if (errorMessage) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
      } else if (error instanceof z.ZodError) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
      } else {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, error)
      }
    }
  }

export const validateData = getValidator<Data>(DataSchema)
export const validateEvent = getValidator<Event>(EventSchema)
export const validateOptions = getValidator<Options>(OptionsSchema)
export const validatePartialData = getValidator<Partial<Data>>(
  DataSchema.partial(),
)

import { MedusaError } from '@medusajs/framework/utils'
import { z } from 'zod'
import {
  DataSchema,
  EventSchema,
  OptionsSchema,
  RawDataSchema,
} from './schemas'
import type { Data, Event, ExtendedData, Options, RawData } from './types'

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
      } else if (error instanceof Error) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
      } else {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, String(error))
      }
    }
  }

export const validateData = getValidator<Data>(DataSchema)
export const validateEvent = getValidator<Event>(EventSchema)
export const validateOptions = getValidator<Options>(OptionsSchema)
export const validatePartialData = getValidator<Partial<Data>>(
  DataSchema.partial(),
)
export const validateExtendedData = (
  data: unknown,
  errorMessage?: string,
): ExtendedData => {
  const validateRawData = getValidator<RawData>(RawDataSchema)
  const validateData = getValidator<Data>(DataSchema)
  const validData = validateData(data, errorMessage)
  const validRawData = validateRawData(data, errorMessage)
  const rawDataKeys = Object.keys(validRawData)
  const emptyRawData = rawDataKeys.reduce((obj, key) => {
    obj[key] = undefined
    return obj
  }, {})
  return { ...emptyRawData, ...validData }
}

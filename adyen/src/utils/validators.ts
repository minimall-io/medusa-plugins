import { MedusaError } from '@medusajs/framework/utils'
import { z } from 'zod'
import {
  OptionsSchema,
  PaymentModificationDataSchema,
  PaymentModificationSchema,
} from './schemas'
import type {
  Options,
  PaymentModification,
  PaymentModificationData,
} from './types'

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

export const validateOptions = getValidator<Options>(OptionsSchema)
export const validatePaymentModification = getValidator<PaymentModification>(
  PaymentModificationSchema,
)
export const validatePaymentModificationData =
  getValidator<PaymentModificationData>(PaymentModificationDataSchema)

export const validatePartialPaymentModificationData = getValidator<
  Partial<PaymentModificationData>
>(PaymentModificationDataSchema.partial())

import { Types } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import { MedusaError } from '@medusajs/framework/utils'
import { z } from 'zod'

export const getValidator =
  <T = any>(schema: z.ZodSchema) =>
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

export const EnvironmentEnumSchema = z.nativeEnum(EnvironmentEnum)

export const ShopperInteractionEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.ShopperInteractionEnum,
)

export const RecurringProcessingModelEnumSchema = z.nativeEnum(
  Types.checkout.PaymentRequest.RecurringProcessingModelEnum,
)

export const OptionsSchema = z.object({
  apiKey: z.string(),
  environment: EnvironmentEnumSchema.optional(),
  hmacKey: z.string(),
  liveEndpointUrlPrefix: z.string(),
  merchantAccount: z.string(),
  recurringProcessingModel: RecurringProcessingModelEnumSchema,
  returnUrlPrefix: z.string(),
  shopperInteraction: ShopperInteractionEnumSchema,
})

export const AmountSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  value: z.number(),
})

export const PaymentModificationSchema = z.object({
  amount: AmountSchema.optional(),
  id: z.string().optional(),
  pspReference: z.string(),
  reference: z.string(),
  status: z.string(),
})

export type Options = z.infer<typeof OptionsSchema>
export type PaymentModification = z.infer<typeof PaymentModificationSchema>

export const validateOptions = getValidator<Options>(OptionsSchema)
export const validatePaymentModification = getValidator<PaymentModification>(
  PaymentModificationSchema,
)

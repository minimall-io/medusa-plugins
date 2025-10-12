import { z } from 'zod'
import { PaymentResponseResultCodeEnumSchema } from './core'
import { getValidator } from './helpers'

const PaymentDataSchema = z.object({
  resultCode: PaymentResponseResultCodeEnumSchema,
  sessionData: z.string(),
  sessionResult: z.string(),
})

const SessionResponseSchema = z.object({
  id: z.string(),
})

const DataSchema = z.object({
  reference: z.string(),
  sessionResponse: SessionResponseSchema,
  paymentData: PaymentDataSchema,
})

const InputSchema = z.object({
  data: DataSchema,
})

export type GetPaymentStatusInput = z.infer<typeof InputSchema>

export const validateGetPaymentStatusInput =
  getValidator<GetPaymentStatusInput>(InputSchema)

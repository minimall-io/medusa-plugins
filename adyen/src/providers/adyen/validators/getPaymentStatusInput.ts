import { z } from 'zod'
import { SessionsResponseSchema } from './core'
import { getValidator } from './helpers'

const DataSchema = z.object({
  reference: z.string(),
  sessionsResponse: SessionsResponseSchema,
})

const InputSchema = z.object({
  data: DataSchema,
})

export type GetPaymentStatusInput = z.infer<typeof InputSchema>

export const validateGetPaymentStatusInput =
  getValidator<GetPaymentStatusInput>(InputSchema)

import { z } from 'zod'
import { SessionsResponseSchema } from './core'
import { getValidator } from './helpers'

const CreateCheckoutSessionResponseSchema = z.object({
  id: z.string(),
})

const DataSchema = z.object({
  reference: z.string(),
  createCheckoutSessionResponse: CreateCheckoutSessionResponseSchema,
  sessionsResponse: SessionsResponseSchema,
})

const InputSchema = z.object({
  data: DataSchema,
})

export type GetPaymentStatusInput = z.infer<typeof InputSchema>

export const validateGetPaymentStatusInput =
  getValidator<GetPaymentStatusInput>(InputSchema)

import { z } from 'zod'
import { CheckoutSessionInstallmentOptionSchema } from '.'

export const InstallmentOptionsSchema = z.record(
  z.string(),
  CheckoutSessionInstallmentOptionSchema,
)

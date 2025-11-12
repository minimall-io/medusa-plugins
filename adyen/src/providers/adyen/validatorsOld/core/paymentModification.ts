import { z } from 'zod'
import { AmountSchema } from '.'

export const PaymentModificationSchema = z.object({
  amount: AmountSchema,
  id: z.string(),
  pspReference: z.string(),
  reference: z.string(),
  status: z.string(),
})

export const PaymentModificationsSchema = z.array(PaymentModificationSchema)

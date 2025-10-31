import { z } from 'zod'
import { AmountSchema } from '.'

export const PaymentModificationSchema = z.object({
  pspReference: z.string(),
  reference: z.string(),
  status: z.string(),
  amount: AmountSchema,
  id: z.string(),
})

export const PaymentModificationsSchema = z.array(PaymentModificationSchema)

import { z } from 'zod'
import {
  AmountSchema,
  PaymentResultCodeEnumSchema,
  ResponsePaymentMethodSchema,
} from '.'

export const PaymentSchema = z.object({
  amount: AmountSchema.optional().nullable(),
  paymentMethod: ResponsePaymentMethodSchema.optional().nullable(),
  pspReference: z.string().optional(),
  resultCode: PaymentResultCodeEnumSchema.optional(),
})

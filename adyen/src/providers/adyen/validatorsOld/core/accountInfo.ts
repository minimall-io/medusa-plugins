import { z } from 'zod'
import {
  AccountAgeIndicatorEnumSchema,
  AccountChangeIndicatorEnumSchema,
  AccountTypeEnumSchema,
  DeliveryAddressUsageIndicatorEnumSchema,
  PasswordChangeIndicatorEnumSchema,
  PaymentAccountIndicatorEnumSchema,
} from '.'

export const AccountInfoSchema = z.object({
  accountAgeIndicator: AccountAgeIndicatorEnumSchema.optional(),
  accountChangeDate: z.date().optional(),
  accountChangeIndicator: AccountChangeIndicatorEnumSchema.optional(),
  accountCreationDate: z.date().optional(),
  accountType: AccountTypeEnumSchema.optional(),
  addCardAttemptsDay: z.number().optional(),
  deliveryAddressUsageDate: z.date().optional(),
  deliveryAddressUsageIndicator:
    DeliveryAddressUsageIndicatorEnumSchema.optional(),
  passwordChangeDate: z.date().optional(),
  passwordChangeIndicator: PasswordChangeIndicatorEnumSchema.optional(),
  pastTransactionsDay: z.number().optional(),
  pastTransactionsYear: z.number().optional(),
  paymentAccountAge: z.date().optional(),
  paymentAccountIndicator: PaymentAccountIndicatorEnumSchema.optional(),
  purchasesLast6Months: z.number().optional(),
  suspiciousActivity: z.boolean().optional(),
})

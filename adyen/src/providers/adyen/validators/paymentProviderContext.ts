import { z } from 'zod'
import { getValidator } from './helpers'
import { StringDateUnionSchema, UnknownRecordSchema } from './primitives'

const AddressDTOSchema = z.object({
  id: z.string().optional(),
  address_1: z.string(),
  address_2: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  country_code: z.string(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  metadata: UnknownRecordSchema.optional().nullable(),
  created_at: StringDateUnionSchema.optional(),
  updated_at: StringDateUnionSchema.optional(),
  deleted_at: StringDateUnionSchema.optional().nullable(),
})

const AccountHolderDTOSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  external_id: z.string(),
  email: z.string().nullable(),
  data: UnknownRecordSchema,
  created_at: StringDateUnionSchema.optional().nullable(),
  updated_at: StringDateUnionSchema.optional().nullable(),
  metadata: UnknownRecordSchema.optional().nullable(),
})

const PaymentCustomerDTOSchema = z.object({
  id: z.string(),
  email: z.string(),
  company_name: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billing_address: AddressDTOSchema.partial().optional().nullable(),
})

export const PaymentProviderContextSchema = z.object({
  account_holder: AccountHolderDTOSchema.optional(),
  customer: PaymentCustomerDTOSchema.optional(),
  idempotency_key: z.string().optional(),
})

export type PaymentProviderContext = z.infer<
  typeof PaymentProviderContextSchema
>

export const validatePaymentProviderContext =
  getValidator<PaymentProviderContext>(PaymentProviderContextSchema)

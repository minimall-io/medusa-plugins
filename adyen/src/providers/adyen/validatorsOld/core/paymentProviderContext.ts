import { z } from 'zod'
import { StringDateUnionSchema, UnknownRecordSchema } from '.'

export const AddressDTOSchema = z.object({
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

export const PaymentCustomerDTOSchema = z.object({
  id: z.string(),
  email: z.string(),
  company_name: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billing_address: AddressDTOSchema.partial().optional().nullable(),
})

export const AccountHolderDTOSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  external_id: z.string(),
  email: z.string().nullable(),
  data: UnknownRecordSchema,
  created_at: StringDateUnionSchema.optional().nullable(),
  updated_at: StringDateUnionSchema.optional().nullable(),
  metadata: UnknownRecordSchema.optional().nullable(),
})

export const PaymentProviderContextSchema = z.object({
  idempotency_key: z.string(),
  customer: PaymentCustomerDTOSchema,
  account_holder: AccountHolderDTOSchema,
})

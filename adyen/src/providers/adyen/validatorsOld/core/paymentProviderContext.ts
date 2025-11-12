import { z } from 'zod'
import { StringDateUnionSchema, UnknownRecordSchema } from '.'

export const AddressDTOSchema = z.object({
  address_1: z.string(),
  address_2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  country_code: z.string(),
  created_at: StringDateUnionSchema.optional(),
  deleted_at: StringDateUnionSchema.optional().nullable(),
  id: z.string().optional(),
  metadata: UnknownRecordSchema.optional().nullable(),
  phone: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  updated_at: StringDateUnionSchema.optional(),
})

export const PaymentCustomerDTOSchema = z.object({
  billing_address: AddressDTOSchema.partial().optional().nullable(),
  company_name: z.string().optional().nullable(),
  email: z.string(),
  first_name: z.string().optional().nullable(),
  id: z.string(),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
})

export const AccountHolderDTOSchema = z.object({
  created_at: StringDateUnionSchema.optional().nullable(),
  data: UnknownRecordSchema,
  email: z.string().nullable(),
  external_id: z.string(),
  id: z.string(),
  metadata: UnknownRecordSchema.optional().nullable(),
  provider_id: z.string(),
  updated_at: StringDateUnionSchema.optional().nullable(),
})

export const PaymentProviderContextSchema = z.object({
  account_holder: AccountHolderDTOSchema,
  customer: PaymentCustomerDTOSchema,
  idempotency_key: z.string(),
})

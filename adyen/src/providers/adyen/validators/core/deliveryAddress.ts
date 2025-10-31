import { AddressSchema, NameSchema } from '.'

export const DeliveryAddressSchema = AddressSchema.merge(NameSchema.partial())

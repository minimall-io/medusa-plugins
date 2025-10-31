import { z } from 'zod'
import {
  CommonFieldSchema,
  ExternalPlatformSchema,
  MerchantDeviceSchema,
  ShopperInteractionDeviceSchema,
} from '.'

export const ApplicationInfoSchema = z.object({
  adyenLibrary: CommonFieldSchema.optional().nullable(),
  adyenPaymentSource: CommonFieldSchema.optional().nullable(),
  externalPlatform: ExternalPlatformSchema.optional().nullable(),
  merchantApplication: CommonFieldSchema.optional().nullable(),
  merchantDevice: MerchantDeviceSchema.optional().nullable(),
  shopperInteractionDevice:
    ShopperInteractionDeviceSchema.optional().nullable(),
})

import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import AdyenPaymentProviderService from './service'

const AdyenPaymentProvider = ModuleProvider(Modules.PAYMENT, {
  services: [AdyenPaymentProviderService],
})

export default AdyenPaymentProvider

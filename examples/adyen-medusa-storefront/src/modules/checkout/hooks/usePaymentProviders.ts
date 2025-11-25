import {
  isAdyen,
  isManual,
  isPaypal,
  isStripe,
  isUnknown,
} from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import {
  IPaymentProviders,
  useAdyenPaymentProvider,
  useManualPaymentProvider,
  useStripePaymentProvider,
} from "@modules/checkout/hooks"
import { useCallback, useMemo, useState } from "react"

const usePaymentProviders = (
  cart: HttpTypes.StoreCart
): IPaymentProviders => {
  const [id, setId] = useState<string>("")
  const adyenPaymentProvider = useAdyenPaymentProvider(cart)
  const stripePaymentProvider = useStripePaymentProvider(cart)
  const manualPaymentProvider = useManualPaymentProvider(cart)

  const select = useCallback(
    async (id: string) => {
      switch (true) {
        case isAdyen(id): {
          setId(id)
          await adyenPaymentProvider.onInit(id)
          return
        }
        case isStripe(id): {
          setId(id)
          await stripePaymentProvider.onInit(id)
          return
        }
        case isManual(id): {
          setId(id)
          await manualPaymentProvider.onInit(id)
          return
        }
        default: {
          setId("")
          return
        }
      }
    },
    [setId, adyenPaymentProvider, stripePaymentProvider, manualPaymentProvider]
  )

  const provider = useMemo(() => {
    switch (true) {
      case isAdyen(id):
        return adyenPaymentProvider
      case isStripe(id):
        return stripePaymentProvider
      case isManual(id):
        return manualPaymentProvider
      default:
        return null
    }
  }, [id, adyenPaymentProvider, stripePaymentProvider, manualPaymentProvider])

  return {
    id,
    provider,
    select,
    isAdyen: isAdyen(id),
    isStripe: isStripe(id),
    isPaypal: isPaypal(id),
    isManual: isManual(id),
    isUnknown: isUnknown(id),
  }
}

export default usePaymentProviders

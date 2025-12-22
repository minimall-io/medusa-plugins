import {
  isAdyen,
  isManual,
  isPaypal,
  isStripe,
  isUnknown,
} from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import {
  IPayment,
  IPaymentProvider,
  useAdyenPayment,
  useManualPayment,
  useStripePayment,
} from "@modules/checkout/hooks"
import { useCallback, useMemo, useState } from "react"

const templatePayment: IPayment<null> = {
  ready: false,
  error: null,
  onUpdate: () => Promise.resolve(),
  onPay: () => Promise.resolve(),
  config: null,
}

const usePaymentProvider = (
  cart: HttpTypes.StoreCart
): IPaymentProvider<unknown> => {
  const [id, setId] = useState<string>("")
  const adyenPayment = useAdyenPayment(cart)
  const stripePayment = useStripePayment(cart)
  const manualPayment = useManualPayment(cart)

  const selectProvider = useCallback(
    async (id: string) => {
      switch (true) {
        case isAdyen(id): {
          await adyenPayment.onUpdate(id)
          setId(id)
          return
        }
        case isStripe(id): {
          await stripePayment.onUpdate(id)
          setId(id)
          return
        }
        case isManual(id): {
          await manualPayment.onUpdate(id)
          setId(id)
          return
        }
        default: {
          setId("")
          return
        }
      }
    },
    [setId, adyenPayment, stripePayment, manualPayment]
  )

  const payment = useMemo(() => {
    switch (true) {
      case isAdyen(id):
        return adyenPayment
      case isStripe(id):
        return stripePayment
      case isManual(id):
        return manualPayment
      default:
        return null
    }
  }, [id, adyenPayment, stripePayment, manualPayment])

  return {
    id,
    payment,
    selectProvider,
    isAdyen: isAdyen(id),
    isStripe: isStripe(id),
    isPaypal: isPaypal(id),
    isManual: isManual(id),
    isUnknown: isUnknown(id),
  }
}

export default usePaymentProvider

import { PaymentProvider } from "@lib/constants"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useCallback, useState } from "react"
import { IManualPayment } from "./interfaces"

const providerId = PaymentProvider.System

const useManualPayment = (cart: HttpTypes.StoreCart): IManualPayment => {
  const [error, setError] = useState<string | null>(null)

  const updatePayment = useCallback(async () => {
    if (!providerId) return
    const provider_id = providerId
    await initiatePaymentSession(cart, { provider_id })
  }, [cart])

  const pay = useCallback(async () => {
    try {
      setError(null)
      await placeOrder()
    } catch (error: any) {
      setError(error.message)
    }
  }, [])

  return {
    id: providerId,
    error,
    ready: true,
    pay,
    updatePayment,
  }
}

export default useManualPayment

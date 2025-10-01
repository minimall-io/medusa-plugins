import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useCallback, useState } from "react"
import { IManualPayment } from "./interfaces"

const useManualPayment = (cart: HttpTypes.StoreCart): IManualPayment => {
  const [error, setError] = useState<string | null>(null)

  const onUpdate = useCallback(
    async (providerId: string) => {
      try {
        setError(null)
        const options = { provider_id: providerId }
        await initiatePaymentSession(cart, options)
      } catch (error: any) {
        setError(error.message)
      }
    },
    [cart]
  )

  const onPay = useCallback(async () => {
    try {
      setError(null)
      await placeOrder()
    } catch (error: any) {
      setError(error.message)
    }
  }, [])

  return {
    ready: true,
    error,
    onUpdate,
    onPay,
    config: null,
  }
}

export default useManualPayment

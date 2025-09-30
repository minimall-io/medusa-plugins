import { isManual } from "@lib/constants"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useCallback, useEffect, useState } from "react"
import { IManualPayment } from "./interfaces"

const useManualPayment = (
  providerId: string,
  cart: HttpTypes.StoreCart
): IManualPayment => {
  const [error, setError] = useState<string | null>(null)

  const onUpdate = useCallback(async () => {
    if (!isManual(providerId)) return
    const options = { provider_id: providerId }
    await initiatePaymentSession(cart, options)
  }, [providerId, cart])

  const onPay = useCallback(async () => {
    try {
      setError(null)
      await placeOrder()
    } catch (error: any) {
      setError(error.message)
    }
  }, [])

  useEffect(() => {
    if (isManual(providerId)) onUpdate()
  }, [providerId])

  return {
    id: providerId,
    ready: true,
    error,
    onUpdate,
    onPay,
    config: null,
  }
}

export default useManualPayment

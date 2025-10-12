import { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"

const getPendingSession = (session: HttpTypes.StorePaymentSession): boolean =>
  session.status === "pending"

const usePaymentSession = (cart: HttpTypes.StoreCart) => {
  const session = useMemo(
    () => cart.payment_collection?.payment_sessions?.find(getPendingSession),
    [cart]
  )

  return session
}

export default usePaymentSession

import { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"

const getPendingSession = (session: HttpTypes.StorePaymentSession): boolean =>
  session.status === "pending"

const useActiveSession = (cart: HttpTypes.StoreCart) => {
  const activeSession = useMemo(
    () => cart.payment_collection?.payment_sessions?.find(getPendingSession),
    [cart]
  )

  return activeSession
}

export default useActiveSession

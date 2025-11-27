import { getPendingSession } from '@lib/util/get-session'
import type { HttpTypes } from '@medusajs/types'
import { useMemo } from 'react'

const usePaymentSession = (
  cart: HttpTypes.StoreCart,
): HttpTypes.StorePaymentSession | undefined => {
  const session = useMemo(
    () => getPendingSession(cart.payment_collection),
    [cart],
  )

  return session
}

export default usePaymentSession

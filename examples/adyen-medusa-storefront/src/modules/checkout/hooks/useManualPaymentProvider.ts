import { initiatePaymentSession, placeOrder } from '@lib/data/cart'
import type { HttpTypes } from '@medusajs/types'
import { useCallback, useState } from 'react'
import type { IManualPaymentProvider } from './interfaces'

const useManualPaymentProvider = (
  cart: HttpTypes.StoreCart,
): IManualPaymentProvider => {
  const [error, setError] = useState<string | null>(null)

  const onInit = useCallback(
    async (providerId: string) => {
      try {
        setError(null)
        const options = { provider_id: providerId }
        await initiatePaymentSession(cart, options)
      } catch (error: any) {
        setError(error.message)
      }
    },
    [cart],
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
    error,
    onInit,
    onPay,
    ready: true,
  }
}

export default useManualPaymentProvider

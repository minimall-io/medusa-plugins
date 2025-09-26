import { initiatePaymentSession } from "@lib/data/cart"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import {
  IProviderSelector,
  Providers,
  usePaymentSession,
} from "@modules/checkout/hooks"
import { useCallback, useEffect, useState } from "react"

const useProviderSelector = (cart: HttpTypes.StoreCart): IProviderSelector => {
  const session = usePaymentSession(cart)
  const providerId = session?.provider_id ?? ""
  const regionId = cart.region?.id ?? ""

  const [providers, setProviders] = useState<Providers | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>(providerId)

  const selectProvider = useCallback(
    async (selectedProviderId: string) => {
      setSelectedProvider(selectedProviderId)
      if (providerId !== selectedProviderId) {
        await initiatePaymentSession(cart, { provider_id: selectedProviderId })
      }
    },
    [providerId]
  )

  const loadProviders = useCallback(async () => {
    const paymentProviders = await listCartPaymentMethods(regionId)
    setProviders(paymentProviders)
  }, [regionId])

  useEffect(() => {
    if (providers === null) loadProviders()
  }, [providers])

  return {
    providers,
    selectedProvider,
    selectProvider,
  }
}

export default useProviderSelector

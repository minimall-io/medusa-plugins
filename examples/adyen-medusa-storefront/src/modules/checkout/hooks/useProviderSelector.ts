import { isAdyen, isManual, isStripe } from "@lib/constants"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import {
  IProviderSelector,
  Providers,
  useAdyenPayment,
  useManualPayment,
  usePaymentSession,
  useStripePayment,
} from "@modules/checkout/hooks"
import { useCallback, useEffect, useState } from "react"

const useProviderSelector = (cart: HttpTypes.StoreCart): IProviderSelector => {
  const session = usePaymentSession(cart)
  const providerId = session?.provider_id ?? ""
  const regionId = cart.region?.id ?? ""

  const [providers, setProviders] = useState<Providers | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>(providerId)
  const adyenPayment = useAdyenPayment(selectedProvider, cart)
  const stripePayment = useStripePayment(selectedProvider, cart)
  const manualPayment = useManualPayment(selectedProvider, cart)

  const determinePayment = () => {
    if (isAdyen(selectedProvider)) return adyenPayment
    if (isStripe(selectedProvider)) return stripePayment
    if (isManual(selectedProvider)) return manualPayment
    return {
      id: selectedProvider,
      ready: false,
      error: null,
      onUpdate: () => Promise.resolve(),
      onPay: () => Promise.resolve(),
      config: null,
    }
  }

  const payment = determinePayment()

  const { onUpdate } = payment

  const selectProvider = useCallback(async (providerId: string) => {
    setSelectedProvider(providerId)
    if (selectedProvider !== providerId) await onUpdate()
  }, [])

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
    ...payment,
  }
}

export default useProviderSelector

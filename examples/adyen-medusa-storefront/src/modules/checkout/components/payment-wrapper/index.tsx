"use client"

import { isStripe } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import {
  IProviderSelector,
  IStripePaymentConfig,
  useProviderSelector,
} from "@modules/checkout/hooks"
import { Elements } from "@stripe/react-stripe-js"
import { createContext } from "react"

interface Props {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const ProviderSelector = createContext<IProviderSelector | null>(null)

const PaymentWrapper = ({ cart, children }: Props) => {
  const providerSelector = useProviderSelector(cart)
  const { selectedProvider, config } = providerSelector
  const { stripeElementsOptions, stripePromise } =
    (config as IStripePaymentConfig) || {}

  if (
    isStripe(selectedProvider) &&
    stripeElementsOptions?.clientSecret &&
    stripePromise
  )
    return (
      <ProviderSelector.Provider value={{ ...providerSelector }}>
        <Elements options={stripeElementsOptions} stripe={stripePromise}>
          {children}
        </Elements>
      </ProviderSelector.Provider>
    )

  return (
    <ProviderSelector.Provider value={{ ...providerSelector }}>
      {children}
    </ProviderSelector.Provider>
  )
}

export default PaymentWrapper

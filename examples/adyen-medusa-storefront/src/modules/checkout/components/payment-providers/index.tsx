"use client"

import { RadioGroup } from "@headlessui/react"
import { isAdyen, isStripe, isUnknown, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useActiveSession } from "@modules/checkout/hooks"
import { StripeCardElementChangeEvent } from "@stripe/stripe-js"
import { useState } from "react"
import AdyenCardPaymentProvider from "./adyen-payment-provider"
import PaymentProvider from "./payment-provider"
import StripeCardPaymentProvider from "./stripe-payment-provider"

interface Props {
  cart: HttpTypes.StoreCart
  providers: HttpTypes.StorePaymentProvider[]
  onSelect: (providerId: string) => void
  onUpdate: (event: StripeCardElementChangeEvent) => void
}

const PaymentProviders = ({ cart, providers, onSelect, onUpdate }: Props) => {
  const activeSession = useActiveSession(cart)
  const providerId = activeSession?.provider_id ?? ""

  const [selectedProvider, setSelectedProvider] = useState(providerId)

  const selectProvider = async (provider: string) => {
    onSelect(provider)
    setSelectedProvider(provider)
    const isProvider = isStripe(provider) || isAdyen(provider)
    if (isProvider) {
      await initiatePaymentSession(cart, {
        provider_id: provider,
      })
    }
  }

  return (
    <>
      <RadioGroup
        value={selectedProvider}
        onChange={(value: string) => selectProvider(value)}
      >
        {providers.map((provider) => (
          <div key={provider.id}>
            {isStripe(provider.id) && (
              <PaymentProvider
                paymentInfoMap={paymentInfoMap}
                paymentProviderId={provider.id}
                selectedPaymentProviderId={selectedProvider}
              >
                <StripeCardPaymentProvider onChange={onUpdate} />
              </PaymentProvider>
            )}
            {isAdyen(provider.id) && (
              <PaymentProvider
                paymentInfoMap={paymentInfoMap}
                paymentProviderId={provider.id}
                selectedPaymentProviderId={selectedProvider}
              >
                <AdyenCardPaymentProvider />
              </PaymentProvider>
            )}
            {isUnknown(provider.id) && (
              <PaymentProvider
                paymentInfoMap={paymentInfoMap}
                paymentProviderId={provider.id}
                selectedPaymentProviderId={selectedProvider}
              />
            )}
          </div>
        ))}
      </RadioGroup>
    </>
  )
}

export default PaymentProviders

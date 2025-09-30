"use client"

import { RadioGroup } from "@headlessui/react"
import { isAdyen, isStripe, paymentInfoMap } from "@lib/constants"
import { ProviderSelector } from "@modules/checkout/components/payment-wrapper"
import {
  IAdyenPaymentConfig,
  IStripePaymentConfig,
} from "@modules/checkout/hooks"
import { useContext } from "react"
import AdyenCardPaymentProviderOption from "./adyen-provider"
import PaymentProviderOption from "./payment-provider"
import StripeCardPaymentProviderOption from "./stripe-provider"

const PaymentProviderOptions = () => {
  const providerSelector = useContext(ProviderSelector)

  if (!providerSelector) return null
  const { selectedProvider, selectProvider, providers, config } =
    providerSelector

  if (!providers) return null

  return (
    <>
      <RadioGroup value={selectedProvider} onChange={selectProvider}>
        {providers.map((provider) => (
          <div key={provider.id}>
            <PaymentProviderOption
              paymentInfoMap={paymentInfoMap}
              providerId={provider.id}
              selectedProviderId={selectedProvider}
            >
              {isStripe(provider.id) && (
                <StripeCardPaymentProviderOption
                  config={config as IStripePaymentConfig}
                />
              )}
              {isAdyen(provider.id) && (
                <AdyenCardPaymentProviderOption
                  config={config as IAdyenPaymentConfig}
                />
              )}
            </PaymentProviderOption>
          </div>
        ))}
      </RadioGroup>
    </>
  )
}

export default PaymentProviderOptions

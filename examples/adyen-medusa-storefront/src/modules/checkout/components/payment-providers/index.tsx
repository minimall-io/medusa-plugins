"use client"

import { RadioGroup } from "@headlessui/react"
import { isUnknown, paymentInfoMap, PaymentProvider } from "@lib/constants"
import { ProviderSelector } from "@modules/checkout/components/payment-wrapper/provider-wrapper"
import { useContext } from "react"
import AdyenCardPaymentProviderOption from "./adyen-provider"
import PaymentProviderOption from "./payment-provider"
import StripeCardPaymentProviderOption from "./stripe-provider"

const PaymentProviderOptions = () => {
  const providerSelector = useContext(ProviderSelector)

  if (!providerSelector) return null
  const { selectedProvider, selectProvider, providers } = providerSelector
  if (!providers) return null

  return (
    <>
      <RadioGroup
        value={selectedProvider}
        onChange={(value: string) => selectProvider(value)}
      >
        {providers.map((provider) => (
          <div key={provider.id}>
            {provider.id === PaymentProvider.StripeCreditCard && (
              <PaymentProviderOption
                paymentInfoMap={paymentInfoMap}
                paymentProviderId={provider.id}
                selectedPaymentProviderId={selectedProvider}
              >
                <StripeCardPaymentProviderOption />
              </PaymentProviderOption>
            )}
            {provider.id === PaymentProvider.AdyenCreditCard && (
              <PaymentProviderOption
                paymentInfoMap={paymentInfoMap}
                paymentProviderId={provider.id}
                selectedPaymentProviderId={selectedProvider}
              >
                <AdyenCardPaymentProviderOption />
              </PaymentProviderOption>
            )}
            {isUnknown(provider.id) && (
              <PaymentProviderOption
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

export default PaymentProviderOptions

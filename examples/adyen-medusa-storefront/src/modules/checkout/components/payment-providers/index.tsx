"use client"

import { RadioGroup } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import { PaymentProvider } from "@modules/checkout/components/payment-wrapper"
import { useContext, useState } from "react"

import PaymentProviderOption from "./payment-provider"

interface Props {
  providers: HttpTypes.StorePaymentProvider[]
}

const PaymentProviderOptions = ({ providers }: Props) => {
  const paymentProvider = useContext(PaymentProvider)
  // The `selectedProvider` is pretty nasty design decision,
  // with the sole purpose to keep the radio selected while the
  // paymentProvider does the async roundtrip to the backend.
  // The `usePaymentProvider` hook and, potentially, other checkout hooks
  // need more work to find a better solution than the current one.
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  if (!paymentProvider) return null
  const { id, selectProvider } = paymentProvider

  const handleOnChange = (providerId: string) => {
    setSelectedProvider(providerId)
    selectProvider(providerId)
  }

  return (
    <>
      <RadioGroup value={id} onChange={handleOnChange}>
        {providers.map((provider) => (
          <div key={provider.id}>
            <PaymentProviderOption
              providerId={provider.id}
              paymentProvider={paymentProvider}
              selected={
                (selectedProvider && provider.id === selectedProvider) ||
                (!selectedProvider && provider.id === id)
              }
            />
          </div>
        ))}
      </RadioGroup>
    </>
  )
}

export default PaymentProviderOptions

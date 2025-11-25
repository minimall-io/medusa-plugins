"use client"

import { RadioGroup } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import { PaymentProviders } from "@modules/checkout/components/payment-wrapper"
import { useContext } from "react"

import PaymentProviderOption from "./payment-provider"

interface Props {
  providers: HttpTypes.StorePaymentProvider[]
}

const PaymentProviderOptions = ({ providers }: Props) => {
  const paymentProviders = useContext(PaymentProviders)

  if (!paymentProviders) return null
  const { id, select } = paymentProviders

  return (
    <>
      <RadioGroup value={id} onChange={select}>
        {providers.map((provider) => (
          <div key={provider.id}>
            <PaymentProviderOption
              providerId={provider.id}
              paymentProviders={paymentProviders}
            />
          </div>
        ))}
      </RadioGroup>
    </>
  )
}

export default PaymentProviderOptions

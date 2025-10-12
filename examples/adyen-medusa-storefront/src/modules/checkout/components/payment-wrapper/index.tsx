"use client"

import { HttpTypes } from "@medusajs/types"
import {
  IPaymentProvider,
  IStripePayment,
  usePaymentProvider,
} from "@modules/checkout/hooks"
import { Elements } from "@stripe/react-stripe-js"
import { createContext } from "react"

interface Props {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const PaymentProvider = createContext<IPaymentProvider<unknown> | null>(
  null
)

const PaymentWrapper = ({ cart, children }: Props) => {
  const provider = usePaymentProvider(cart)

  if (provider.isStripe) {
    const { config } = provider.payment as IStripePayment
    const { stripeElementsOptions, stripePromise } = config

    return (
      <PaymentProvider.Provider value={{ ...provider }}>
        <Elements options={stripeElementsOptions} stripe={stripePromise}>
          {children}
        </Elements>
      </PaymentProvider.Provider>
    )
  }

  return (
    <PaymentProvider.Provider value={{ ...provider }}>
      {children}
    </PaymentProvider.Provider>
  )
}

export default PaymentWrapper

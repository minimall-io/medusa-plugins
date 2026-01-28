"use client"

import { HttpTypes } from "@medusajs/types"
import {
  IPaymentProviders,
  IStripePaymentProvider,
  usePaymentProviders,
} from "@modules/checkout/hooks"
import { Elements } from "@stripe/react-stripe-js"
import { createContext } from "react"

interface Props {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const PaymentProviders = createContext<IPaymentProviders | null>(
  null
)

const PaymentWrapper = ({ cart, children }: Props) => {
  const paymentProviders = usePaymentProviders(cart)

  if (paymentProviders.isStripe) {
    const { stripeElementsOptions, stripePromise } = paymentProviders.provider as IStripePaymentProvider

    return (
      <PaymentProviders.Provider value={{ ...paymentProviders }}>
        <Elements options={stripeElementsOptions} stripe={stripePromise}>
          {children}
        </Elements>
      </PaymentProviders.Provider>
    )
  }

  return (
    <PaymentProviders.Provider value={{ ...paymentProviders }}>
      {children}
    </PaymentProviders.Provider>
  )
}

export default PaymentWrapper

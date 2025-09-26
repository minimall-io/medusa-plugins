"use client"

import { HttpTypes } from "@medusajs/types"
import { IStripePayment, useStripePayment } from "@modules/checkout/hooks"
import { Elements } from "@stripe/react-stripe-js"
import { createContext } from "react"

interface Props {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const StripePayment = createContext<IStripePayment | null>(null)

const StripeWrapper = ({ cart, children }: Props) => {
  const stripePayment = useStripePayment(cart)
  const { stripeElementsOptions, stripePromise } = stripePayment

  return (
    <StripePayment.Provider value={{ ...stripePayment }}>
      <Elements options={stripeElementsOptions} stripe={stripePromise}>
        {children}
      </Elements>
    </StripePayment.Provider>
  )
}

export default StripeWrapper

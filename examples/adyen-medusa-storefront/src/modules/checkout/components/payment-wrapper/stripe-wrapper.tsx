"use client"

import { isStripe } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import { Elements } from "@stripe/react-stripe-js"
import { StripeElementsOptions, loadStripe } from "@stripe/stripe-js"
import { createContext } from "react"

interface Props {
  paymentSession: HttpTypes.StorePaymentSession
  children: React.ReactNode
}

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

export const StripeContext = createContext(false)

const StripeWrapper = ({ paymentSession, children }: Props) => {
  if (!isStripe(paymentSession?.provider_id)) {
    throw new Error("The session payment provider isn't Stripe!")
  }

  if (!stripeKey) {
    throw new Error(
      "Stripe key is missing. Set NEXT_PUBLIC_STRIPE_KEY environment variable."
    )
  }

  if (!stripePromise) {
    throw new Error(
      "Stripe promise is missing. Make sure you have provided a valid Stripe key."
    )
  }

  if (!paymentSession?.data?.client_secret) {
    throw new Error(
      "Stripe client secret is missing. Cannot initialize Stripe."
    )
  }

  const options: StripeElementsOptions = {
    clientSecret: paymentSession.data.client_secret as string | undefined,
  }

  return (
    <StripeContext.Provider value={true}>
      <Elements options={options} stripe={stripePromise}>
        {children}
      </Elements>
    </StripeContext.Provider>
  )
}

export default StripeWrapper

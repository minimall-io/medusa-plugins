import { PaymentProvider } from "@lib/constants"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import {
  loadStripe,
  StripeElementChangeEvent,
  StripeElementsOptions,
} from "@stripe/stripe-js"
import { useCallback, useState } from "react"
import { IStripePayment } from "./interfaces"
import usePaymentSession from "./usePaymentSession"

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null
const providerId = PaymentProvider.StripeCreditCard

const useStripePayment = (cart: HttpTypes.StoreCart): IStripePayment => {
  const session = usePaymentSession(cart)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<boolean>(false)

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

  if (!session) {
    throw new Error("Payment session is missing. Cannot initialize Stripe.")
  }

  if (!session.data?.client_secret) {
    throw new Error(
      "Stripe client secret is missing. Cannot initialize Stripe."
    )
  }

  const stripeElementsOptions: StripeElementsOptions = {
    clientSecret: session.data.client_secret as string | undefined,
  }

  const onChange = useCallback((event: StripeElementChangeEvent) => {
    console.log("Stripe change event:", event)
    setError(event?.error?.message || null)
    setReady(event.complete)
  }, [])

  const updatePayment = useCallback(async () => {
    if (!providerId) return
    const provider_id = providerId
    await initiatePaymentSession(cart, { provider_id })
  }, [cart])

  const pay = useCallback(async () => {
    try {
      setError(null)
      await placeOrder()
    } catch (error: any) {
      setError(error.message)
    }
  }, [])

  return {
    id: providerId,
    error,
    ready,
    pay,
    updatePayment,
    stripePromise,
    stripeElementsOptions,
    onChange,
  }
}

export default useStripePayment

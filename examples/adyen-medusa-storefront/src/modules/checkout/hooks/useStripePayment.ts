import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import {
  loadStripe,
  StripeElementChangeEvent,
  StripeElementsOptions,
} from "@stripe/stripe-js"
import { useCallback, useState } from "react"
import { IStripePayment } from "./interfaces"

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const useStripePayment = (cart: HttpTypes.StoreCart): IStripePayment => {
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<boolean>(false)
  const [clientSecret, setClientSecret] = useState<string | undefined>()
  const stripeElementsOptions: StripeElementsOptions = { clientSecret }

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

  const onChange = useCallback((event: StripeElementChangeEvent) => {
    console.log("Stripe change event:", event)
    setError(event?.error?.message || null)
    setReady(event.complete)
  }, [])

  const onUpdate = useCallback(
    async (providerId: string) => {
      try {
        setError(null)
        const options = { provider_id: providerId }
        const response = await initiatePaymentSession(cart, options)
        const session = response.payment_collection?.payment_sessions?.find(
          (session) => session.provider_id === providerId
        )
        const secret = session?.data?.client_secret as string | undefined
        if (!secret) {
          throw new Error(
            "Stripe client secret is missing. Cannot initialize Stripe."
          )
        }
        setClientSecret(secret)
        console.log("Stripe updatePayment session:", session)
      } catch (error: any) {
        setError(error.message)
      }
    },
    [cart]
  )

  const onPay = useCallback(async () => {
    if (!ready) return
    try {
      setError(null)
      await placeOrder()
    } catch (error: any) {
      setError(error.message)
    }
  }, [ready])

  return {
    ready,
    error,
    onUpdate,
    onPay,
    config: {
      stripePromise,
      stripeElementsOptions,
      onChange,
    },
  }
}

export default useStripePayment

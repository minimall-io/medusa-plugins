import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import {
  loadStripe,
  StripeElementChangeEvent,
  StripeElementsOptions,
} from "@stripe/stripe-js"
import { useCallback, useState } from "react"
import { IStripePaymentProvider } from "./interfaces"

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const useStripePaymentProvider = (cart: HttpTypes.StoreCart): IStripePaymentProvider => {
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
    setError(event?.error?.message || null)
    setReady(event.complete)
  }, [])

  const onInit = useCallback(
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
      } catch (error: any) {
        setError(error.message)
      }
    },
    [cart]
  )

  const onPay = useCallback(async () => {
    try {
      setError(null)
      await placeOrder()
    } catch (error: any) {
      setError(error.message)
    }
  }, [])

  return {
    ready,
    error,
    onInit,
    onPay,
    stripePromise,
    stripeElementsOptions,
    onChange,
  }
}

export default useStripePaymentProvider

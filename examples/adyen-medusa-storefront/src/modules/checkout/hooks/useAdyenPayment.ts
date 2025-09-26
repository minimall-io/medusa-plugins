import {
  AdyenCheckout,
  AdyenCheckoutError,
  Core,
  OnChangeData,
  PaymentData,
  UIElement,
} from "@adyen/adyen-web"
import "@adyen/adyen-web/styles/adyen.css"
import { PaymentProvider } from "@lib/constants"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useCallback, useEffect, useState } from "react"
import { AdyenEnvironment, IAdyenPayment } from "./interfaces"

const clientKey = process.env.NEXT_PUBLIC_ADYEN_KEY
const environment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT ||
  "test") as AdyenEnvironment
const providerId = PaymentProvider.AdyenCreditCard

const useAdyenPayment = (cart: HttpTypes.StoreCart): IAdyenPayment => {
  const [checkout, setCheckout] = useState<Core | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<boolean>(false)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const countryCode = cart.billing_address?.country_code

  if (!clientKey) {
    throw new Error(
      "Adyen key is missing. Set NEXT_PUBLIC_ADYEN_KEY environment variable."
    )
  }

  if (!countryCode) {
    throw new Error("Cart billing address (country code) is missing.")
  }

  const onChange = useCallback((state: OnChangeData, component: UIElement) => {
    console.log("Adyen change state:", state)
    const { data, isValid, errors } = state

    setReady(isValid)
    setPaymentData(isValid ? data : null)

    if (!errors) return

    const error = Object.values(errors).find((error) => error !== null)
    setError(error?.errorMessage || null)
  }, [])

  const onError = useCallback(
    (error: AdyenCheckoutError, component?: UIElement) => {
      console.error(error.name, error.message, error.stack, component)
    },
    []
  )

  const updatePayment = useCallback(async () => {
    if (!ready || !providerId || !paymentData) return
    const provider_id = providerId
    const data = paymentData as unknown as Record<string, unknown>
    await initiatePaymentSession(cart, { provider_id, data })
  }, [cart, paymentData, ready])

  const pay = useCallback(async () => {
    if (!ready) return
    try {
      setError(null)
      await placeOrder()
    } catch (error: any) {
      setError(error.message)
    }
  }, [ready])

  const initAdyenCheckout = useCallback(async () => {
    if (!clientKey || !countryCode || !environment) return
    try {
      const config = {
        locale: "en_US",
        countryCode,
        environment,
        clientKey,
        showPayButton: false,
        onChange,
        onError,
      }
      const checkout = await AdyenCheckout(config)
      setCheckout(checkout)
    } catch (error) {
      setCheckout(null)
      console.error("Error initializing Adyen checkout configuration:", error)
    }
  }, [countryCode, environment, clientKey])

  useEffect(() => {
    if (clientKey && countryCode) initAdyenCheckout()

    return () => {
      setCheckout(null)
    }
  }, [countryCode, environment, clientKey])

  return {
    id: providerId,
    error,
    ready,
    pay,
    updatePayment,
    checkout,
    onChange,
  }
}

export default useAdyenPayment

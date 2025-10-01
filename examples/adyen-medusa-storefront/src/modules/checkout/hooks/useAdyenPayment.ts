import {
  AdyenCheckout,
  AdyenCheckoutError,
  Core,
  OnChangeData,
  PaymentData,
  PaymentMethodsResponse,
  UIElement,
} from "@adyen/adyen-web"
import "@adyen/adyen-web/styles/adyen.css"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useCallback, useEffect, useState } from "react"
import { AdyenEnvironment, ChannelEnum, IAdyenPayment } from "./interfaces"

const clientKey = process.env.NEXT_PUBLIC_ADYEN_KEY
const environment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT ||
  "test") as AdyenEnvironment
const channel = ChannelEnum.Web

const useAdyenPayment = (cart: HttpTypes.StoreCart): IAdyenPayment => {
  const [checkout, setCheckout] = useState<Core | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<boolean>(false)
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [paymentMethods, setPaymentMethods] =
    useState<PaymentMethodsResponse | null>(null)
  const countryCode = cart.billing_address?.country_code

  if (!clientKey) {
    throw new Error(
      "Adyen key is missing. Set NEXT_PUBLIC_ADYEN_KEY environment variable."
    )
  }

  const onChange = useCallback((state: OnChangeData, component: UIElement) => {
    console.log("Adyen change state:", state)
    console.log("Adyen change component:", component)
    const { data, isValid, errors } = state

    setReady(isValid)
    setPayment(data)
    setError(() => {
      if (!errors) return null
      const error = Object.values(errors).find((error) => error !== null)
      if (!error) return null
      return error.errorMessage
    })
  }, [])

  const onError = useCallback(
    (error: AdyenCheckoutError, component?: UIElement) => {
      console.error(error.name, error.message, error.stack, component)
    },
    []
  )

  const onUpdate = useCallback(
    async (providerId: string) => {
      try {
        setError(null)
        const data = { cart, payment, ready, channel }
        const options = { provider_id: providerId, data }
        const response = await initiatePaymentSession(cart, options)
        const session = response.payment_collection?.payment_sessions?.find(
          (session) => session.provider_id === providerId
        )
        setPaymentMethods(() => {
          if (session) return session.data as PaymentMethodsResponse
          return null
        })
        console.log("Adyen updatePayment data:", data)
        console.log("Adyen updatePayment session:", session)
      } catch (error: any) {
        setError(error.message)
      }
    },
    [cart, payment, ready]
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

  const onInit = useCallback(async () => {
    try {
      const config = {
        environment,
        clientKey,
        countryCode,
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
  }, [countryCode])

  useEffect(() => {
    if (clientKey && countryCode) onInit()

    return () => {
      setError(null)
      setReady(false)
      setCheckout(null)
      setPayment(null)
      setPaymentMethods(null)
    }
  }, [countryCode])

  return {
    ready,
    error,
    onUpdate,
    onPay,
    config: {
      checkout,
      onChange,
      ...paymentMethods,
    },
  }
}

export default useAdyenPayment

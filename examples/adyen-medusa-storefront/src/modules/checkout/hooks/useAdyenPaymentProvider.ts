import {
  AdyenCheckoutError,
  PaymentAmount,
  PaymentCompletedData,
  PaymentFailedData,
  OnChangeData,
  UIElement,
  PaymentData,
} from "@adyen/adyen-web"
import {
  initiatePaymentSession,
  placeOrder,
  updatePaymentSession,
} from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useCallback, useMemo, useState } from "react"
import { getAdyenRequest, getAdyenRequestFromCart } from "../utils"
import { AdyenEnvironment, IAdyenPaymentProvider } from "./interfaces"

interface Session extends Record<string, unknown> {
  id: string
  amount: PaymentAmount
}

const clientKey = process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY
const environment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT ||
  "test") as AdyenEnvironment

const baseConfig = {
  environment,
  clientKey,
  showPayButton: true,
}

const useAdyenPaymentProvider = (cart: HttpTypes.StoreCart): IAdyenPaymentProvider => {
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [session, setSession] = useState<
    HttpTypes.StorePaymentSession | undefined
  >()

  const onInit = useCallback(
    async (providerId: string) => {
      try {
        setError(null)
        const request = getAdyenRequest(cart)
        const data = { request }
        const options = { provider_id: providerId, data }
        const response = await initiatePaymentSession(cart, options)
        const session = response.payment_collection?.payment_sessions?.find(
          (session) => session.provider_id === providerId
        )
        setSession(session)
      } catch (error: any) {
        setError(error.message)
      }
    },
    [cart]
  )

  const onUpdate = useCallback(
    async () => {
      if (!session) return
      try {
        setError(null)
        const request = getAdyenRequest(cart, paymentData)
        const data = { request }
        await updatePaymentSession(session.id, data)

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

  const onError = useCallback((error: AdyenCheckoutError) => {
    setError(error.message)
  }, [])

  const onPaymentCompleted = useCallback((data: PaymentCompletedData) => {
    console.log("useAdyenPayment/onPaymentCompleted/data", data)
  }, [])

  const onPaymentFailed = useCallback((data: PaymentFailedData) => {
    console.log("useAdyenPayment/onPaymentFailed/data", data)
  }, [])

  const onChange = useCallback((state: OnChangeData, component: UIElement) => {
    const { data, isValid, errors } = state
    setReady(isValid)
    setPaymentData(data)
    setError( errors ? Object.values(errors).map((error) => error.errorMessage).join(", ") : null )
  }, [])

  const config = useMemo(() => {
    const parsedCart = getAdyenRequestFromCart(cart)
    const { countryCode } = parsedCart
    if (!baseConfig.clientKey || !session || !countryCode) return null
    const checkoutSession = session.data.checkoutSession as Session
    const { amount } = checkoutSession
    return {
      ...baseConfig,
      session: checkoutSession,
      amount,
      countryCode,
      locale: "en-US", // TODO: Extract local from the user.
      onPaymentCompleted,
      onPaymentFailed,
      onError,
      onChange,
    }
  }, [session, cart])

  return {
    ready,
    error,
    onInit,
    onUpdate,
    onChange,
    onPay,
    config,
  }
}

export default useAdyenPaymentProvider

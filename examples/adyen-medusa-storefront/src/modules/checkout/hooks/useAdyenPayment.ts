import {
  AdyenCheckoutError,
  PaymentAmount,
  PaymentCompletedData,
  PaymentFailedData,
} from "@adyen/adyen-web"
import {
  initiatePaymentSession,
  placeOrder,
  updatePaymentSession,
} from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useCallback, useMemo, useState } from "react"
import { getAdyenRequest, getAdyenRequestFromCart } from "../utils"
import { AdyenEnvironment, IAdyenPayment } from "./interfaces"

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

const useAdyenPayment = (cart: HttpTypes.StoreCart): IAdyenPayment => {
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<
    HttpTypes.StorePaymentSession | undefined
  >()

  const checkoutSession = session?.data.createCheckoutSessionResponse as
    | Session
    | undefined

  const onUpdate = useCallback(
    async (providerId: string) => {
      try {
        setError(null)
        const createCheckoutSessionRequest = getAdyenRequest(cart)
        const data = { createCheckoutSessionRequest }
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

  const onPaymentCompleted = useCallback(
    async (input: PaymentCompletedData) => {
      console.log("useAdyenPayment/onPaymentCompleted/input", input)
      console.log("useAdyenPayment/onPaymentCompleted/session", session)
      if (!session) return
      if (input.resultCode !== "Authorised") return
      if (!("sessionResult" in input) || !input.sessionResult) return
      try {
        setError(null)
        console.log("useAdyenPayment/onPaymentCompleted/try/start")
        const checkoutSession = session.data
          .createCheckoutSessionResponse as Session
        const sessionsResponse = { ...input, sessionId: checkoutSession.id }
        const data = { ...session.data, sessionsResponse }
        await updatePaymentSession(session.id, data)
        await placeOrder()
        console.log("useAdyenPayment/onPaymentCompleted/try/end")
      } catch (error: any) {
        setError(error.message)
      }
    },
    [session]
  )

  const onPaymentFailed = useCallback((data: PaymentFailedData) => {
    console.log("useAdyenPayment/onPaymentFailed/data", data)
  }, [])

  const config = useMemo(() => {
    const parsedCart = getAdyenRequestFromCart(cart)
    const { countryCode } = parsedCart
    if (!baseConfig.clientKey || !checkoutSession || !countryCode) return null
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
    }
  }, [session, cart])

  return {
    ready: true,
    error,
    onUpdate,
    onPay,
    config,
  }
}

export default useAdyenPayment

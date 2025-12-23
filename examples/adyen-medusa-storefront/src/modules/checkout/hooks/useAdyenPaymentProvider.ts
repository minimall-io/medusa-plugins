import type {
  AdyenCheckoutError,
  OnChangeData,
  PaymentData,
  PaymentMethodsResponse,
} from '@adyen/adyen-web'
import {
  initiatePaymentSession,
  placeOrder,
  updatePaymentSession,
} from '@lib/data/cart'
import { formatAdyenRequest } from '@lib/util/format-adyen-request'
import { getProviderSession } from '@lib/util/get-session'
import { handlePaymentResponse } from '@lib/util/payment-response'
import type { HttpTypes } from '@medusajs/types'
import { useParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import type { AdyenEnvironment, IAdyenPaymentProvider } from './interfaces'

const clientKey = process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY
const environment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT ||
  'test') as AdyenEnvironment

const baseConfig = {
  clientKey,
  environment,
  showPayButton: false,
}

const useAdyenPaymentProvider = (
  cart: HttpTypes.StoreCart,
): IAdyenPaymentProvider => {
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [session, setSession] = useState<
    HttpTypes.StorePaymentSession | undefined
  >()

  const { countryCode } = useParams<{ countryCode: string }>()

  const onInit = useCallback(
    async (providerId: string) => {
      try {
        setError(null)
        const request = formatAdyenRequest(cart, countryCode)
        const data = { request }
        const options = { data, provider_id: providerId }
        const response = await initiatePaymentSession(cart, options)
        const session = getProviderSession(
          response.payment_collection,
          providerId,
        )
        setSession(session)
      } catch (error: any) {
        setError(error.message)
      }
    },
    [cart, countryCode],
  )

  const onUpdate = useCallback(async () => {
    if (!session) return
    try {
      setError(null)
      const request = formatAdyenRequest(
        cart,
        countryCode,
        session.id,
        paymentData,
      )
      const data = { request }
      await updatePaymentSession(session.id, data)
    } catch (error: any) {
      setError(error.message)
    }
  }, [cart, paymentData, session, countryCode])

  const onPay = useCallback(async () => {
    if (!session) return
    try {
      setError(null)
      const providerId = session.provider_id
      const response = await placeOrder()
      const newSession = getProviderSession(
        response.payment_collection,
        providerId,
      )
      setSession(newSession)
      if (!newSession) return
      handlePaymentResponse(newSession.data.paymentResponse)
    } catch (error: any) {
      setError(error.message)
    }
  }, [session])

  const onError = useCallback((error: AdyenCheckoutError) => {
    setError(error.message)
  }, [])

  const onChange = useCallback((state: OnChangeData) => {
    const { data, isValid, errors } = state
    setPaymentData(data)
    setReady(isValid)
    if (errors) {
      setError(
        Object.values(errors)
          .filter((error) => error !== null)
          .map((error) => error.errorMessage)
          .join(', '),
      )
    } else {
      setError(null)
    }
  }, [])

  const config = useMemo(() => {
    if (!baseConfig.clientKey || !session || !countryCode) return null
    const paymentMethodsResponse = session.data
      .paymentMethodsResponse as PaymentMethodsResponse
    return {
      ...baseConfig,
      countryCode,
      locale: 'en-US', // TODO: Extract local from the user.
      onChange,
      onError,
      paymentMethodsResponse,
    }
  }, [session, countryCode])

  return {
    config,
    error,
    onChange,
    onInit,
    onPay,
    onUpdate,
    ready,
  }
}

export default useAdyenPaymentProvider

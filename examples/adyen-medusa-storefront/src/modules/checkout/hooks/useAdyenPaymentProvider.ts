import type {
  AdyenCheckoutError,
  OnChangeData,
  PaymentAction,
  PaymentCompletedData,
  PaymentData,
  PaymentFailedData,
  PaymentMethodsResponse,
  PaymentResponseData,
} from '@adyen/adyen-web'
import {
  initiatePaymentSession,
  placeOrder,
  updatePaymentSession,
} from '@lib/data/cart'
import { formatAdyenRequest } from '@lib/util/format-adyen-request'
import { getProviderSession } from '@lib/util/get-session'
import type { HttpTypes } from '@medusajs/types'
import { useParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import type { AdyenEnvironment, IAdyenPaymentProvider } from './interfaces'

interface Action extends PaymentAction {
  url: string
  method: string
  data: Record<string, string>
}

interface PaymentResponse extends Omit<PaymentResponseData, 'action'> {
  action?: Action
}

const clientKey = process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY
const environment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT ||
  'test') as AdyenEnvironment

const baseConfig = {
  clientKey,
  environment,
  showPayButton: false,
}

const handleRedirectAction = (action: Action) => {
  console.log('useAdyenPayment/handleRedirectAction/action', action)
  if (action.type === 'redirect' && action.url && action.method === 'POST') {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = action.url
    if (action.data) {
      Object.entries(action.data).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      })
    }
    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }
}

const handlePaymentResponse = (
  paymentResponse: PaymentResponse | undefined,
) => {
  console.log(
    'useAdyenPayment/handlePaymentResponse/paymentResponse',
    paymentResponse,
  )
  if (!paymentResponse) return
  const action = paymentResponse.action
  if (!action) return
  switch (action.type) {
    case 'redirect':
      handleRedirectAction(action)
      break
    default:
      break
  }
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
        const request = formatAdyenRequest(cart, providerId, countryCode)
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
      const providerId = session.provider_id
      const request = formatAdyenRequest(
        cart,
        providerId,
        countryCode,
        paymentData,
      )
      const data = { request }
      console.log('useAdyenPayment/onUpdate/data', data)
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
      console.log('useAdyenPayment/onPay/response', response)
      const newSession = getProviderSession(
        response.payment_collection,
        providerId,
      )
      setSession(newSession)
      if (!newSession) return
      handlePaymentResponse(newSession.data.paymentResponse as PaymentResponse)
    } catch (error: any) {
      setError(error.message)
    }
  }, [session])

  const onError = useCallback((error: AdyenCheckoutError) => {
    setError(error.message)
  }, [])

  const onPaymentCompleted = useCallback((data: PaymentCompletedData) => {
    console.log('useAdyenPayment/onPaymentCompleted/data', data)
  }, [])

  const onPaymentFailed = useCallback((data: PaymentFailedData) => {
    console.log('useAdyenPayment/onPaymentFailed/data', data)
  }, [])

  const onChange = useCallback((state: OnChangeData) => {
    console.log('useAdyenPayment/onChange/state', state)
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
      onPaymentCompleted,
      onPaymentFailed,
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

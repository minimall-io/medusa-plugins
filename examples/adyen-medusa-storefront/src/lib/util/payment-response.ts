import type { PaymentAction, PaymentResponseData } from '@adyen/adyen-web'
import { RedirectType, redirect } from 'next/navigation'

interface Action extends PaymentAction {
  url: string
  method: string
  data: Record<string, string>
}

interface PaymentResponse extends Omit<PaymentResponseData, 'action'> {
  action?: Action
}

const handleGetRedirectAction = (action: Action) => {
  redirect(action.url, RedirectType.replace)
}

const handlePostRedirectAction = (action: Action) => {
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

const handleRedirectAction = (action: Action) => {
  if (!action.url) return
  if (action.method === 'POST') return handlePostRedirectAction(action)
  return handleGetRedirectAction(action)
}

export const getPaymentResponse = (input: unknown) =>
  input as PaymentResponse | undefined

export const handlePaymentResponse = (input: unknown) => {
  const paymentResponse = getPaymentResponse(input)
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

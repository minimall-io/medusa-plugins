"use client"

import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { IStripePayment, usePaymentSession } from "@modules/checkout/hooks"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { ConfirmCardPaymentData } from "@stripe/stripe-js"
import { useState } from "react"
import ErrorMessage from "../error-message"

type Props = {
  cart: HttpTypes.StoreCart
  ready: boolean
  payment: IStripePayment
}

const StripePaymentButton = ({ cart, ready, payment }: Props) => {
  const session = usePaymentSession(cart)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const stripe = useStripe()
  const elements = useElements()

  const card = elements?.getElement("card")
  const clientSecret = session?.data.client_secret as string

  const disabled =
    !ready || !payment?.ready || !stripe || !elements || !card || !clientSecret

  const error = payment?.error || errorMessage

  const handlePayment = async () => {
    if (disabled) return

    const { onPay } = payment

    const data: ConfirmCardPaymentData = {
      payment_method: {
        card: card,
        billing_details: {
          name:
            cart.billing_address?.first_name +
            " " +
            cart.billing_address?.last_name,
          address: {
            city: cart.billing_address?.city ?? undefined,
            country: cart.billing_address?.country_code ?? undefined,
            line1: cart.billing_address?.address_1 ?? undefined,
            line2: cart.billing_address?.address_2 ?? undefined,
            postal_code: cart.billing_address?.postal_code ?? undefined,
            state: cart.billing_address?.province ?? undefined,
          },
          email: cart.email,
          phone: cart.billing_address?.phone ?? undefined,
        },
      },
    }

    try {
      setSubmitting(true)
      const result = await stripe.confirmCardPayment(clientSecret, data)
      const status = result.paymentIntent?.status
      if (status && (status === "succeeded" || status === "requires_capture"))
        await onPay()
    } catch (error: any) {
      const status = error.payment_intent?.status
      if (status && (status === "succeeded" || status === "requires_capture"))
        await onPay()
      setErrorMessage(error.message || null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={disabled}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid="stripe-payment-button"
      >
        Place order
      </Button>
      <ErrorMessage error={error} data-testid="stripe-payment-error-message" />
    </>
  )
}

export default StripePaymentButton

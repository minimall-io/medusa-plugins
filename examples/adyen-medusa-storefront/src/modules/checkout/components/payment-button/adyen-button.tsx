"use client"

import { Button } from "@medusajs/ui"
import { IAdyenPayment } from "@modules/checkout/hooks"
import { useState } from "react"
import ErrorMessage from "../error-message"

type Props = {
  ready: boolean
  payment: IAdyenPayment
}

const AdyenPaymentButton = ({ ready, payment }: Props) => {
  const [submitting, setSubmitting] = useState<boolean>(false)

  const disabled = !ready || !payment.ready
  const error = payment.error

  const handlePayment = async () => {
    if (disabled) return
    setSubmitting(true)
    await payment.onPay()
    setSubmitting(false)
  }

  return (
    <>
      <Button
        disabled={disabled}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid="adyen-payment-button"
      >
        Place order
      </Button>
      <ErrorMessage error={error} data-testid="adyen-payment-error-message" />
    </>
  )
}

export default AdyenPaymentButton

"use client"

import { Button } from "@medusajs/ui"
import { IAdyenPaymentProvider } from "@modules/checkout/hooks"
import { useState } from "react"
import ErrorMessage from "../error-message"

type Props = {
  ready: boolean
  provider: IAdyenPaymentProvider
}

const AdyenPaymentButton = ({ ready, provider }: Props) => {
  const [submitting, setSubmitting] = useState<boolean>(false)

  const disabled = !ready
  const error = provider.error

  const handlePayment = async () => {
    if (disabled) return
    setSubmitting(true)
    await provider.onPay()
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

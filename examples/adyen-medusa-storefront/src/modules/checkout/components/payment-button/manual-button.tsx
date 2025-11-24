"use client"

import { Button } from "@medusajs/ui"
import { IManualPaymentProvider } from "@modules/checkout/hooks"
import { useState } from "react"
import ErrorMessage from "../error-message"

type Props = {
  ready: boolean
  provider: IManualPaymentProvider
}

const ManualTestPaymentButton = ({ ready, provider }: Props) => {
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
        data-testid="manual-test-payment-button"
      >
        Place order
      </Button>
      <ErrorMessage error={error} data-testid="manual-payment-error-message" />
    </>
  )
}

export default ManualTestPaymentButton

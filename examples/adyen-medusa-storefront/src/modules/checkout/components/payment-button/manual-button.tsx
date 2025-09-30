"use client"

import { Button } from "@medusajs/ui"
import { ProviderSelector } from "@modules/checkout/components/payment-wrapper"
import { useContext, useState } from "react"
import ErrorMessage from "../error-message"

type Props = {
  ready: boolean
}

const ManualTestPaymentButton = ({ ready }: Props) => {
  const [submitting, setSubmitting] = useState<boolean>(false)
  const providerSelector = useContext(ProviderSelector)

  const disabled = !ready || !providerSelector?.ready
  const error = providerSelector?.error

  const handlePayment = async () => {
    if (disabled) return
    setSubmitting(true)
    await providerSelector.onPay()
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

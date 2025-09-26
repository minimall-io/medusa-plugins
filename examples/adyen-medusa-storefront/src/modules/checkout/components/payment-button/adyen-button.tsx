"use client"

import { Button } from "@medusajs/ui"
import { AdyenPayment } from "@modules/checkout/components/payment-wrapper/adyen-wrapper"
import { useContext, useState } from "react"
import ErrorMessage from "../error-message"

type Props = {
  ready: boolean
}

const AdyenPaymentButton = ({ ready }: Props) => {
  const [submitting, setSubmitting] = useState<boolean>(false)
  const adyenPayment = useContext(AdyenPayment)

  console.log("AdyenPaymentButton/adyenPayment/", adyenPayment)

  const disabled = !ready || !adyenPayment?.ready
  const error = adyenPayment?.error

  const handlePayment = async () => {
    if (disabled) return
    setSubmitting(true)
    await adyenPayment.pay()
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

"use client"

import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { PaymentProvider } from "@modules/checkout/components/payment-wrapper"
import {
  IAdyenPayment,
  IManualPayment,
  IStripePayment,
  usePaymentSession,
} from "@modules/checkout/hooks"
import { useContext } from "react"
import AdyenPaymentButton from "./adyen-button"
import ManualTestPaymentButton from "./manual-button"
import StripePaymentButton from "./stripe-button"

type Props = {
  cart: HttpTypes.StoreCart
}

const PaymentButton = ({ cart }: Props) => {
  const paymentProvider = useContext(PaymentProvider)
  const session = usePaymentSession(cart)

  if (!paymentProvider || !paymentProvider.payment)
    return (
      <Button isLoading disabled>
        Waiting for the provider
      </Button>
    )

  const { payment, isAdyen, isStripe, isManual } = paymentProvider

  const ready =
    session !== undefined &&
    cart.email !== undefined &&
    cart.shipping_address !== undefined &&
    cart.billing_address !== undefined &&
    (cart.shipping_methods?.length ?? 0) > 0

  if (ready && isAdyen)
    return (
      <AdyenPaymentButton ready={ready} payment={payment as IAdyenPayment} />
    )
  if (ready && isStripe)
    return (
      <StripePaymentButton
        ready={ready}
        cart={cart}
        payment={payment as IStripePayment}
      />
    )
  if (ready && isManual)
    return (
      <ManualTestPaymentButton
        ready={ready}
        payment={payment as IManualPayment}
      />
    )
  return <Button disabled>Select a payment method</Button>
}

export default PaymentButton

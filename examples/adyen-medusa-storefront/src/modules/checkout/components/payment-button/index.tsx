"use client"

import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { PaymentProviders } from "@modules/checkout/components/payment-wrapper"
import {
  IAdyenPaymentProvider,
  IManualPaymentProvider,
  IStripePaymentProvider,
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
  const paymentProviders = useContext(PaymentProviders)
  const session = usePaymentSession(cart)

  if (!paymentProviders || !paymentProviders.provider)
    return (
      <Button isLoading disabled>
        Waiting for the provider
      </Button>
    )

  const { provider, isAdyen, isStripe, isManual } = paymentProviders

  const ready =
    session !== undefined &&
    cart.email !== undefined &&
    cart.shipping_address !== undefined &&
    cart.billing_address !== undefined &&
    (cart.shipping_methods?.length ?? 0) > 0

  if (ready && isAdyen)
    return (
      <AdyenPaymentButton ready={ready} provider={provider as IAdyenPaymentProvider} />
    )
  if (ready && isStripe)
    return (
      <StripePaymentButton
        ready={ready}
        cart={cart}
        provider={provider as IStripePaymentProvider}
      />
    )
  if (ready && isManual)
    return (
      <ManualTestPaymentButton
        ready={ready}
        provider={provider as IManualPaymentProvider}
      />
    )
  return <Button disabled>Select a payment method</Button>
}

export default PaymentButton

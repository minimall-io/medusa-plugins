"use client"

import { isAdyen, isManual, isStripe } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import { usePaymentSession } from "@modules/checkout/hooks"
import AdyenPaymentButton from "./adyen-button"
import ManualTestPaymentButton from "./manual-button"
import StripePaymentButton from "./stripe-button"

type Props = {
  cart: HttpTypes.StoreCart
}

const PaymentButton = ({ cart }: Props) => {
  const session = usePaymentSession(cart)
  const providerId = session?.provider_id || ""

  const ready =
    session !== undefined &&
    cart.email !== undefined &&
    cart.shipping_address !== undefined &&
    cart.billing_address !== undefined &&
    (cart.shipping_methods?.length ?? 0) > 0

  if (ready && isAdyen(providerId)) return <AdyenPaymentButton ready={ready} />
  if (ready && isStripe(providerId))
    return <StripePaymentButton ready={ready} cart={cart} />
  if (ready && isManual(providerId))
    return <ManualTestPaymentButton ready={ready} />
}

export default PaymentButton

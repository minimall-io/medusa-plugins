"use client"

import { isUnknown, PaymentProvider } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import { usePaymentSession } from "@modules/checkout/hooks"
import React from "react"
import AdyenWrapper from "./adyen-wrapper"
import ManualWrapper from "./manual-wrapper"
import ProviderWrapper from "./provider-wrapper"
import StripeWrapper from "./stripe-wrapper"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ cart, children }) => {
  const session = usePaymentSession(cart)

  return (
    <ProviderWrapper cart={cart}>
      {session?.provider_id === PaymentProvider.StripeCreditCard && (
        <StripeWrapper cart={cart}>{children}</StripeWrapper>
      )}
      {session?.provider_id === PaymentProvider.AdyenCreditCard && (
        <AdyenWrapper cart={cart}>{children}</AdyenWrapper>
      )}
      {session?.provider_id === PaymentProvider.System && (
        <ManualWrapper cart={cart}>{children}</ManualWrapper>
      )}
      {isUnknown(session?.provider_id) && children}
    </ProviderWrapper>
  )
}

export default PaymentWrapper

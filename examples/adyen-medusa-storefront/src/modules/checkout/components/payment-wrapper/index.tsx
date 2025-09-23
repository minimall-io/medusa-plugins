"use client"

import { isStripe } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import { useActiveSession } from "@modules/checkout/hooks"
import React from "react"
import StripeWrapper from "./stripe-wrapper"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ cart, children }) => {
  const paymentSession = useActiveSession(cart)

  if (!paymentSession) return children

  const { provider_id } = paymentSession

  if (isStripe(provider_id))
    return (
      <StripeWrapper paymentSession={paymentSession}>{children}</StripeWrapper>
    )

  return children
}

export default PaymentWrapper

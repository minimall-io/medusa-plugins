import { CreditCard } from "@medusajs/icons"
import React from "react"

import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_adyen_MinimallLLCECOM: {
    title: "Credit Card (Adyen)",
    icon: <CreditCard />,
  },
  pp_stripe_stripe: {
    title: "Credit Card (Stripe)",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal (Stripe)",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact (Stripe)",
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "Manual Payment",
    icon: <CreditCard />,
  },
  // Add more payment providers here
}

// This only checks if it is native stripe for card payments, it ignores the other stripe-based providers
export const isDefined = (providerId?: string) => providerId !== undefined

export const isAdyen = (providerId?: string) =>
  isDefined(providerId) && providerId.startsWith("pp_adyen_")

export const isStripe = (providerId?: string) =>
  isDefined(providerId) && providerId.startsWith("pp_stripe_")

export const isPaypal = (providerId?: string) =>
  isDefined(providerId) && providerId.startsWith("pp_paypal")

export const isManual = (providerId?: string) =>
  isDefined(providerId) && providerId.startsWith("pp_system_default")

export const isUnknown = (providerId?: string) =>
  !isAdyen(providerId) &&
  !isStripe(providerId) &&
  !isPaypal(providerId) &&
  !isManual(providerId)

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]

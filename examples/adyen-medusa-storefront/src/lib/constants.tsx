import { CreditCard } from "@medusajs/icons"
import React from "react"

import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"

export enum PaymentProvider {
  AdyenCreditCard = "pp_adyen_MinimallLLCECOM",
  StripeCreditCard = "pp_stripe_stripe",
  StripeIdeal = "pp_stripe-ideal_stripe",
  StripeBancontact = "pp_stripe-bancontact_stripe",
  PayPal = "pp_paypal_paypal",
  System = "pp_system_default",
}

type PaymentInfoMap = Record<string, { title: string; icon: React.JSX.Element }>

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: PaymentInfoMap = {
  [PaymentProvider.AdyenCreditCard]: {
    title: "Credit Card (Adyen)",
    icon: <CreditCard />,
  },
  [PaymentProvider.StripeCreditCard]: {
    title: "Credit Card (Stripe)",
    icon: <CreditCard />,
  },
  [PaymentProvider.StripeIdeal]: {
    title: "iDeal (Stripe)",
    icon: <Ideal />,
  },
  [PaymentProvider.StripeBancontact]: {
    title: "Bancontact (Stripe)",
    icon: <Bancontact />,
  },
  [PaymentProvider.PayPal]: {
    title: "PayPal",
    icon: <PayPal />,
  },
  [PaymentProvider.System]: {
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

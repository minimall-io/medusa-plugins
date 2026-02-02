import { CreditCard } from "@medusajs/icons"
import React from "react"

import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"

interface PaymentInfo {
  title: string
  icon: React.JSX.Element
}


const adyenProviderId = process.env.NEXT_PUBLIC_ADYEN_PROVIDER_ID || "pp_adyen"
const stripeProviderId = process.env.NEXT_PUBLIC_STRIPE_PROVIDER_ID || "pp_stripe"
const stripeCardProviderId = process.env.NEXT_PUBLIC_STRIPE_CARD_PROVIDER_ID || "pp_stripe_stripe"
const stripeIdealProviderId = process.env.NEXT_PUBLIC_STRIPE_IDEAL_PROVIDER_ID || "pp_stripe-ideal_stripe"
const stripeBancontactProviderId = process.env.NEXT_PUBLIC_STRIPE_BANCONTACT_PROVIDER_ID || "pp_stripe-bancontact_stripe"
const paypalProviderId = process.env.NEXT_PUBLIC_PAYPAL_PROVIDER_ID || "pp_paypal"
const manualProviderId = process.env.NEXT_PUBLIC_MANUAL_PROVIDER_ID || "pp_system"

// This only checks if it is native stripe for card payments, it ignores the other stripe-based providers

export const isAdyen = (providerId?: string): boolean => providerId?.startsWith(adyenProviderId) ?? false

export const isStripe = (providerId?: string): boolean => providerId?.startsWith(stripeProviderId) ?? false

export const isStripeCard = (providerId?: string): boolean => providerId?.startsWith(stripeCardProviderId) ?? false

export const isStripeIdeal = (providerId?: string): boolean => providerId?.startsWith(stripeIdealProviderId) ?? false

export const isStripeBancontact = (providerId?: string): boolean => providerId?.startsWith(stripeBancontactProviderId) ?? false

export const isPaypal = (providerId?: string): boolean => providerId?.startsWith(paypalProviderId) ?? false

export const isManual = (providerId?: string): boolean => providerId?.startsWith(manualProviderId) ?? false

export const isUnknown = (providerId?: string): boolean =>
  !isAdyen(providerId) &&
  !isStripe(providerId) &&
  !isPaypal(providerId) &&
  !isManual(providerId)

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const getPaymentInfo = (providerId?: string): PaymentInfo => {
  if (isStripeCard(providerId)) return {
    title: "Credit Card (Stripe)",
    icon: <CreditCard />,
  }

  if (isStripeBancontact(providerId)) return {
    title: "Bancontact (Stripe)",
    icon: <Bancontact />,
  }

  if (isStripeIdeal(providerId)) return {
    title: "iDeal (Stripe)",
    icon: <Ideal />,
  }

  if (isStripe(providerId)) return {
    title: "Credit Card (Stripe)",
    icon: <CreditCard />,
  }

  if (isPaypal(providerId)) return {
    title: "PayPal",
    icon: <PayPal />,
  }

  if (isAdyen(providerId)) return {
    title: "Credit Card (Adyen)",
    icon: <CreditCard />,
  }

  if (isManual(providerId)) return {
    title: "Manual Payment",
    icon: <CreditCard />,
  }

  return {
    title: providerId || "Unknown",
    icon: <CreditCard />,
  }
}

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

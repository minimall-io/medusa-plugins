import { Core, OnChangeData, UIElement } from "@adyen/adyen-web"
import { HttpTypes } from "@medusajs/types"
import {
  Stripe,
  StripeElementChangeEvent,
  StripeElementsOptions,
} from "@stripe/stripe-js"

export type Providers = HttpTypes.StorePaymentProvider[]

export interface IProviderSelector {
  providers: Providers | null
  selectedProvider: string
  selectProvider: (providerId: string) => Promise<void>
}

export interface IPayment {
  id: string
  error: string | null
  ready: boolean
  pay: () => Promise<void>
  updatePayment: () => Promise<void>
}

export type AdyenEnvironment =
  | "test"
  | "live"
  | "live-us"
  | "live-au"
  | "live-apse"
  | "live-in"

export interface IAdyenPayment extends IPayment {
  checkout: Core | null
  onChange: (state: OnChangeData, component: UIElement) => void
}

export interface IStripePayment extends IPayment {
  stripePromise: Promise<Stripe | null> | null
  stripeElementsOptions: StripeElementsOptions
  onChange: (event: StripeElementChangeEvent) => void
}

export interface IManualPayment extends IPayment {}

import { Core, OnChangeData, UIElement } from "@adyen/adyen-web"
import { HttpTypes } from "@medusajs/types"
import {
  Stripe,
  StripeElementChangeEvent,
  StripeElementsOptions,
} from "@stripe/stripe-js"

export type Providers = HttpTypes.StorePaymentProvider[]

export enum ChannelEnum {
  IOs = "iOS",
  Android = "Android",
  Web = "Web",
}

export type AdyenEnvironment =
  | "test"
  | "live"
  | "live-us"
  | "live-au"
  | "live-apse"
  | "live-in"

export interface IAdyenPaymentConfig {
  checkout: Core | null
  onChange: (state: OnChangeData, component: UIElement) => void
}

export interface IStripePaymentConfig {
  stripePromise: Promise<Stripe | null> | null
  stripeElementsOptions: StripeElementsOptions
  onChange: (event: StripeElementChangeEvent) => void
}

export interface IPayment<Config> {
  id: string
  ready: boolean
  error: string | null
  onUpdate: () => Promise<void>
  onPay: () => Promise<void>
  config: Config
}

export type IAdyenPayment = IPayment<IAdyenPaymentConfig>
export type IStripePayment = IPayment<IStripePaymentConfig>
export type IManualPayment = IPayment<null>

export interface IProviderSelector
  extends IPayment<IAdyenPaymentConfig | IStripePaymentConfig | null> {
  providers: Providers | null
  selectedProvider: string
  selectProvider: (providerId: string) => void
}

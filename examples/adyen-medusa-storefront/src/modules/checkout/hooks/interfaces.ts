import {
  AdyenCheckoutError,
  OnChangeData,
  PaymentMethodsResponse,
  UIElement,
} from "@adyen/adyen-web"
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
  onChange: (state: OnChangeData, component: UIElement) => void
  onError: (error: AdyenCheckoutError, component?: UIElement) => void
  paymentMethodsResponse?: PaymentMethodsResponse
  countryCode?: string
}

export interface IStripePaymentConfig {
  stripePromise: Promise<Stripe | null> | null
  stripeElementsOptions: StripeElementsOptions
  onChange: (event: StripeElementChangeEvent) => void
}

export interface IPayment<Config> {
  ready: boolean
  error: string | null
  onUpdate: (providerId: string) => Promise<void>
  onPay: () => Promise<void>
  config: Config
}

export type IAdyenPayment = IPayment<IAdyenPaymentConfig>
export type IStripePayment = IPayment<IStripePaymentConfig>
export type IManualPayment = IPayment<null>

export interface IPaymentProvider<Config> {
  id: string
  payment: IPayment<Config> | null
  selectProvider: (providerId: string) => Promise<void>
  isAdyen: boolean
  isStripe: boolean
  isPaypal: boolean
  isManual: boolean
  isUnknown: boolean
}

import { CoreConfiguration, OnChangeData, UIElement } from "@adyen/adyen-web"
import { HttpTypes } from "@medusajs/types"
import {
  Stripe,
  StripeElementChangeEvent,
  StripeElementsOptions,
} from "@stripe/stripe-js"

export type Providers = HttpTypes.StorePaymentProvider[]

export type AdyenEnvironment =
  | "test"
  | "live"
  | "live-us"
  | "live-au"
  | "live-apse"
  | "live-in"


export interface IPaymentProvider {
  ready: boolean
  error: string | null
  onInit: (providerId: string) => Promise<void>
  onPay: () => Promise<void>
  onUpdate?: () => Promise<void>
}

export interface IStripePaymentProvider extends IPaymentProvider {
  stripePromise: Promise<Stripe | null> | null
  stripeElementsOptions: StripeElementsOptions
  onChange: (event: StripeElementChangeEvent) => void
}

export interface IAdyenPaymentProvider extends IPaymentProvider {
  config: CoreConfiguration | null
  onChange: (state: OnChangeData, component: UIElement) => void
}

export interface IManualPaymentProvider extends IPaymentProvider {
}

export interface IPaymentProviders {
  id: string
  provider: IStripePaymentProvider | IAdyenPaymentProvider | IManualPaymentProvider | null
  select: (providerId: string) => Promise<void>
  isAdyen: boolean
  isStripe: boolean
  isPaypal: boolean
  isManual: boolean
  isUnknown: boolean
}

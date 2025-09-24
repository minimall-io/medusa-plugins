"use client"

import { AdyenCheckout, Core } from "@adyen/adyen-web"
import "@adyen/adyen-web/styles/adyen.css"
import { HttpTypes } from "@medusajs/types"
import { createContext, useMemo, useState } from "react"

type AdyenEnvironment =
  | "test"
  | "live"
  | "live-us"
  | "live-au"
  | "live-apse"
  | "live-in"

interface Props {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

interface IAdyenContext {
  checkout: Core | null
  onSubmit: (state: any, component: any) => void
}

const onSubmit = (state: any, component: any) => {
  state.isValid // True or false. Specifies if all the information that the shopper provided is valid.
  state.data // Provides the data that you need to pass in the `/payments` call.
  component // Provides the active component instance that called this event.
}

const clientKey = process.env.NEXT_PUBLIC_ADYEN_KEY
const environment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT ||
  "test") as AdyenEnvironment

export const AdyenContext = createContext<IAdyenContext>({
  checkout: null,
  onSubmit,
})

const AdyenWrapper = ({ cart, children }: Props) => {
  const [checkout, setCheckout] = useState<Core | null>(null)
  const countryCode = cart.billing_address?.country_code

  if (!clientKey) {
    throw new Error(
      "Adyen key is missing. Set NEXT_PUBLIC_ADYEN_KEY environment variable."
    )
  }

  if (!countryCode) {
    throw new Error("Cart billing address (country code) is missing.")
  }

  const config = {
    locale: "en_US",
    countryCode,
    environment,
    clientKey,
    onSubmit,
  }

  const initAdyenCheckout = async () => {
    const adyenCheckout = await AdyenCheckout(config)
    setCheckout(adyenCheckout)
  }

  useMemo(initAdyenCheckout, [config])

  return (
    <AdyenContext.Provider value={{ checkout, onSubmit }}>
      {children}
    </AdyenContext.Provider>
  )
}

export default AdyenWrapper

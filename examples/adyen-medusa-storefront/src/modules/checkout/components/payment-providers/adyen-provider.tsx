"use client"

import {
  AdyenCheckout,
  Card,
  CardConfiguration,
  Core,
  Dropin,
  DropinConfiguration,
  Klarna,
} from "@adyen/adyen-web"
import "@adyen/adyen-web/styles/adyen.css"
import { IAdyenPaymentProvider } from "@modules/checkout/hooks"
import { useEffect, useRef, useState } from "react"

interface Props {
  provider: IAdyenPaymentProvider
}

const card: CardConfiguration = {
  enableStoreDetails: true,
}

const dropinConfiguration: DropinConfiguration = {
  showStoredPaymentMethods: true,
  showPaymentMethods: true,
  showRemovePaymentMethodButton: true,
  showRadioButton: true,
  paymentMethodComponents: [Card, Klarna],
  paymentMethodsConfiguration: {
    card,
  },
}

const AdyenProviderOption = ({ provider }: Props) => {
  const [checkout, setCheckout] = useState<Core | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { config } = provider

  useEffect(() => {
    if (!config) return

    const initateCheckout = async () => {
      try {
        const checkout = await AdyenCheckout(config)
        setCheckout(checkout)
      } catch (error) {
        setCheckout(null)
        console.error("Error initializing Adyen checkout configuration:", error)
      }
    }

    if (config) initateCheckout()
  }, [config])

  useEffect(() => {
    if (!checkout || !containerRef.current) return

    try {
      const dropin = new Dropin(checkout, dropinConfiguration)
      dropin.mount(containerRef.current)

      return () => {
        dropin.remove()
      }
    } catch (error) {
      console.error("Error mounting Adyen CustomCard:", error)
    }
  }, [checkout])

  if (!checkout) return null

  return <div id="adyen-container" ref={containerRef}></div>
}

export default AdyenProviderOption

import { AdyenCheckout, Card, Core } from "@adyen/adyen-web"
import { AdyenEnvironment, IAdyenPayment } from "@modules/checkout/hooks"
import { useCallback, useEffect, useRef, useState } from "react"

interface Props {
  payment: IAdyenPayment
}

const clientKey = process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY
const environment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT ||
  "test") as AdyenEnvironment

const cardConfiguration = {
  enableStoreDetails: true,
}

const AdyenProviderOption = ({ payment }: Props) => {
  const newCardRef = useRef<HTMLDivElement>(null)
  const [checkout, setCheckout] = useState<Core | null>(null)

  const { countryCode, onChange, onError } = payment.config

  const onInit = useCallback(async () => {
    if (!clientKey || !countryCode) return
    try {
      const config = {
        environment,
        clientKey,
        countryCode,
        showPayButton: false,
        onChange,
        onError,
      }
      const checkout = await AdyenCheckout(config)
      setCheckout(checkout)
    } catch (error) {
      setCheckout(null)
      console.error("Error initializing Adyen checkout configuration:", error)
    }
  }, [countryCode])

  useEffect(() => {
    if (clientKey && countryCode) onInit()
  }, [countryCode])

  useEffect(() => {
    if (!checkout || !newCardRef.current) return

    try {
      const newCard = new Card(checkout, cardConfiguration)
      newCard.mount(newCardRef.current)

      return () => {
        newCard.unmount()
      }
    } catch (error) {
      console.error("Error mounting Adyen CustomCard:", error)
    }
  }, [checkout])

  if (!checkout) return null

  return <div id="new-card" ref={newCardRef}></div>
}

export default AdyenProviderOption

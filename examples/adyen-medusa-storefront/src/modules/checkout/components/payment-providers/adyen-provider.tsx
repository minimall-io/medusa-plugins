import { Card } from "@adyen/adyen-web"
import { IAdyenPaymentConfig } from "@modules/checkout/hooks"
import { useEffect, useRef } from "react"

interface Props {
  config: IAdyenPaymentConfig | null
}

const AdyenProviderOption = ({ config }: Props) => {
  const adyenContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!config || !config.checkout || !adyenContainerRef.current) {
      return
    }

    try {
      const card = new Card(config.checkout)
      card.mount(adyenContainerRef.current)

      return () => {
        card.unmount()
      }
    } catch (error) {
      console.error("Error mounting Adyen CustomCard:", error)
    }
  }, [config?.checkout])

  if (!config?.checkout) {
    return null
  }

  return <div id="adyen-container" ref={adyenContainerRef}></div>
}

export default AdyenProviderOption

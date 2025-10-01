import { Card } from "@adyen/adyen-web"
import { IAdyenPayment } from "@modules/checkout/hooks"
import { useEffect, useRef } from "react"

interface Props {
  payment: IAdyenPayment
}

const AdyenProviderOption = ({ payment }: Props) => {
  const adyenContainerRef = useRef<HTMLDivElement>(null)

  const { checkout } = payment.config

  useEffect(() => {
    if (!checkout || !adyenContainerRef.current) return

    try {
      const card = new Card(checkout)
      card.mount(adyenContainerRef.current)

      return () => {
        card.unmount()
      }
    } catch (error) {
      console.error("Error mounting Adyen CustomCard:", error)
    }
  }, [checkout])

  if (!checkout) return null

  return <div id="adyen-container" ref={adyenContainerRef}></div>
}

export default AdyenProviderOption

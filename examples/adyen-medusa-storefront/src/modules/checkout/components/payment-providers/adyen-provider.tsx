import { Card } from "@adyen/adyen-web"
import { AdyenPayment } from "@modules/checkout/components/payment-wrapper/adyen-wrapper"
import { useContext, useEffect, useRef } from "react"

const AdyenProviderOption = () => {
  const adyenPayment = useContext(AdyenPayment)
  const adyenContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!adyenPayment || !adyenPayment.checkout || !adyenContainerRef.current) {
      return
    }

    try {
      const card = new Card(adyenPayment.checkout)
      card.mount(adyenContainerRef.current)

      return () => {
        card.unmount()
      }
    } catch (error) {
      console.error("Error mounting Adyen CustomCard:", error)
    }
  }, [adyenPayment?.checkout])

  if (!adyenPayment?.checkout) {
    return null
  }

  return <div id="adyen-container" ref={adyenContainerRef}></div>
}

export default AdyenProviderOption

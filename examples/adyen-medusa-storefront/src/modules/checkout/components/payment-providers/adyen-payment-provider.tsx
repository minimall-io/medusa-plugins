import { CustomCard } from "@adyen/adyen-web"
import { AdyenContext } from "@modules/checkout/components/payment-wrapper/adyen-wrapper"

import { useContext, useEffect, useRef } from "react"

const AdyenCardPaymentProvider = () => {
  const adyenContext = useContext(AdyenContext)
  const { checkout, onSubmit } = adyenContext
  const adyenContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!checkout || !adyenContainerRef.current) {
      return // Don't proceed if checkout is not available or ref is not set
    }

    try {
      // Create and mount the CustomCard component only once
      const customCardInstance = new CustomCard(checkout, {
        brands: ["mc", "visa", "amex", "bcmc", "maestro"],
        styles: {
          error: {
            color: "red",
          },
          validated: {
            color: "green",
          },
          placeholder: {
            color: "#d8d8d8",
          },
        },
        // The onSubmit callback is correctly placed here
        onSubmit: onSubmit,
        // If you need to map generic 'onChange' to Adyen events, you'd add them here:
        // onFieldValid: (state) => { /* handle field validity changes */ },
        // onBrand: (brand) => { /* handle brand detection */ }
        onConfigSuccess: () => {
          return null
        },
      })
      // Mount the component to the ref's current element
      customCardInstance.mount(adyenContainerRef.current)

      return () => {
        customCardInstance.unmount()
      }
    } catch (error) {
      console.error("Error mounting Adyen CustomCard:", error)
    }
  }, [checkout, onSubmit])

  if (!checkout) return null

  return (
    <div id="adyen-container" ref={adyenContainerRef}>
      <label>
        <span>Card number:</span>
        <span data-cse="encryptedCardNumber"></span>
      </label>
      <label>
        <span>Expiry date:</span>
        <span data-cse="encryptedExpiryDate"></span>
      </label>
      <label>
        <span>CVV/CVC:</span>
        <span data-cse="encryptedSecurityCode"></span>
      </label>
    </div>
  )
}

export default AdyenCardPaymentProvider

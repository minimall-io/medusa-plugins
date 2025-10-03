import {
  AddressData,
  AdyenCheckout,
  AdyenCheckoutError,
  Core,
  OnChangeData,
  PaymentAmount,
  PaymentData,
  PaymentMethodsResponse,
  UIElement,
} from "@adyen/adyen-web"
import "@adyen/adyen-web/styles/adyen.css"
import { initiatePaymentSession, placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AdyenEnvironment, ChannelEnum, IAdyenPayment } from "./interfaces"

interface PaymentRequest extends Partial<PaymentData> {
  channel?: ChannelEnum
  shopperConversionId?: string
  shopperEmail?: string
  countryCode?: string
  telephoneNumber?: string
  amount?: PaymentAmount
  // shopperIP, ??? Where do we get this data from?
}

const clientKey = process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY
const environment = (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT ||
  "test") as AdyenEnvironment
const channel = ChannelEnum.Web

/**
 * Parses a full street address into its street number and street name.
 * Accounts for common international formats where the number might be at the beginning or end.
 *
 * @param {string} fullAddress The complete street address string.
 * @returns {[number | null, string]} A tuple (array) where the first element is the street number
 *                                   (as a number) and the second is the street name (as a string).
 *                                   Returns [null, fullAddress] if no number can be reliably extracted.
 */
const parseStreetAddress = (fullAddress: string): [number, string] | null => {
  const trimmedAddress = fullAddress.trim()

  // Pattern 1: Number at the beginning
  // Examples: "123 Almond St", "123A Main Road", "10-B Elm Street", "221B Baker Street"
  // The regex captures digits, optionally followed by hyphens or word characters (for 'A', 'B', '10-12', etc.).
  const pattern1 = /^(\d+[-\w]*)\s+(.*)$/
  let match1 = trimmedAddress.match(pattern1)

  if (match1) {
    const streetNumber = parseInt(match1[1], 10) // parseInt extracts the numerical part (e.g., "123A" -> 123)
    const streetName = match1[2].trim()
    // Validate if a meaningful number and name were extracted
    if (!isNaN(streetNumber) && streetName.length > 0) {
      return [streetNumber, streetName]
    }
  }

  // Pattern 2: Number at the end
  // Examples: "Almond St 123", "Main Road, 123A", "Elm Street 10-B", "Rue de la Paix 10", "Hauptstraße 50a"
  // The regex captures the street name first (non-greedy), then one or more commas or spaces,
  // then the number part (digits, optionally with hyphens or word characters).
  const pattern2 = /^(.*?)[,\s]+(\d+[-\w]*)\s*$/
  let match2 = trimmedAddress.match(pattern2)

  if (match2) {
    const streetNumber = parseInt(match2[2], 10) // Number is in the second capturing group
    const streetName = match2[1].trim()
    // Validate if a meaningful number and name were extracted
    if (!isNaN(streetNumber) && streetName.length > 0) {
      return [streetNumber, streetName]
    }
  }

  // If no pattern matches or the extracted parts are not valid,
  // return null for the number and the original (trimmed) address as the street name.
  // This indicates that a street number could not be reliably parsed.
  return null
}

const getCartAddressData = (
  address?: HttpTypes.StoreCartAddress
): AddressData | undefined => {
  if (!address) return

  const { country_code, province, postal_code, city, address_1 } = address

  if (!country_code || !province || !postal_code || !city || !address_1) return

  const country = country_code.toUpperCase()
  const stateOrProvince = province
  const postalCode = postal_code
  const streetAddress = parseStreetAddress(address_1)

  const houseNumberOrName =
    streetAddress !== null ? streetAddress[0].toString() : ""

  const street = streetAddress !== null ? streetAddress[1] : ""

  return {
    country,
    stateOrProvince,
    postalCode,
    city,
    houseNumberOrName,
    street,
  }
}

const getCartPaymentRequest = (cart?: HttpTypes.StoreCart): PaymentRequest => {
  if (!cart) return {}
  const {
    id: shopperConversionId,
    email: shopperEmail,
    shipping_address,
    billing_address,
    total: value,
    currency_code,
  } = cart

  const currency = currency_code.toUpperCase()

  const amount = {
    currency,
    value,
  }

  const billingAddress = getCartAddressData(billing_address)
  const deliveryAddress = getCartAddressData(shipping_address)

  const countryCode = billingAddress?.country
  const telephoneNumber = billing_address?.phone

  return {
    shopperConversionId,
    shopperEmail,
    countryCode,
    telephoneNumber,
    billingAddress,
    deliveryAddress,
    amount,
    // shopperIP, ??? Where do we get this data from?
  }
}

const getPaymentRequest = (
  payment: PaymentData | null,
  cart?: HttpTypes.StoreCart,
  channel: ChannelEnum = ChannelEnum.Web
): PaymentRequest => {
  const cartDetails = getCartPaymentRequest(cart)

  return { channel, ...cartDetails, ...payment }
}

const useAdyenPayment = (cart: HttpTypes.StoreCart): IAdyenPayment => {
  const [checkout, setCheckout] = useState<Core | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<boolean>(false)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [paymentMethods, setPaymentMethods] =
    useState<PaymentMethodsResponse | null>(null)

  const { countryCode } = useMemo(() => getCartPaymentRequest(cart), [cart])

  if (!clientKey) {
    throw new Error(
      "Adyen key is missing. Set NEXT_PUBLIC_ADYEN_KEY environment variable."
    )
  }

  const onChange = useCallback((state: OnChangeData, component: UIElement) => {
    console.log("Adyen change state:", state)
    console.log("Adyen change component:", component)
    const { data, isValid, errors } = state

    setReady(isValid)
    setPaymentData(data)
    setError(() => {
      if (!errors) return null
      const error = Object.values(errors).find((error) => error !== null)
      if (!error) return null
      return error.errorMessage
    })
  }, [])

  const onError = useCallback(
    (error: AdyenCheckoutError, component?: UIElement) => {
      console.error(error.name, error.message, error.stack, component)
    },
    []
  )

  const onUpdate = useCallback(
    async (providerId: string) => {
      try {
        setError(null)
        const paymentRequest = getPaymentRequest(paymentData, cart)
        const data = { paymentRequest, ready }
        const options = { provider_id: providerId, data }
        const response = await initiatePaymentSession(cart, options)
        const session = response.payment_collection?.payment_sessions?.find(
          (session) => session.provider_id === providerId
        )
        setPaymentMethods(() => {
          if (session) return session.data as PaymentMethodsResponse
          return null
        })
        console.log("Adyen updatePayment data:", data)
        console.log("Adyen updatePayment session:", session)
      } catch (error: any) {
        setError(error.message)
      }
    },
    [cart, paymentData, ready]
  )

  const onPay = useCallback(async () => {
    if (!ready) return
    try {
      setError(null)
      await placeOrder()
    } catch (error: any) {
      setError(error.message)
    }
  }, [ready])

  const onInit = useCallback(async () => {
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

    return () => {
      setError(null)
      setReady(false)
      setCheckout(null)
      setPaymentData(null)
      setPaymentMethods(null)
    }
  }, [countryCode])

  return {
    ready,
    error,
    onUpdate,
    onPay,
    config: {
      checkout,
      onChange,
      ...paymentMethods,
    },
  }
}

export default useAdyenPayment

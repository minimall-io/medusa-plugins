import { AddressData, PaymentData } from "@adyen/adyen-web"
import { HttpTypes } from "@medusajs/types"

export enum ChannelEnum {
  IOs = "iOS",
  Android = "Android",
  Web = "Web",
}

export interface Request extends Partial<PaymentData> {
  channel?: ChannelEnum
  shopperConversionId?: string
  shopperEmail?: string
  countryCode?: string
  telephoneNumber?: string
  // shopperIP, ??? Where do we get this data from?
}

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

export const getAdyenRequestAddressFromCart = (
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

export const getAdyenRequestFromCart = (
  cart?: HttpTypes.StoreCart
): Request => {
  if (!cart) return {}
  const {
    id: shopperConversionId,
    email: shopperEmail,
    shipping_address,
    billing_address,
  } = cart

  const billingAddress = getAdyenRequestAddressFromCart(billing_address)
  const deliveryAddress = getAdyenRequestAddressFromCart(shipping_address)

  const countryCode = billingAddress?.country
  const telephoneNumber = billing_address?.phone

  return {
    shopperConversionId,
    shopperEmail,
    countryCode,
    telephoneNumber,
    billingAddress,
    deliveryAddress,
    // shopperIP, ??? Where do we get this data from?
  }
}

export const getAdyenRequest = (
  cart: HttpTypes.StoreCart,
  payment: PaymentData | null = null,
  channel: ChannelEnum = ChannelEnum.Web
): Request => {
  const cartDetails = getAdyenRequestFromCart(cart)
  return { channel, ...cartDetails, ...payment }
}

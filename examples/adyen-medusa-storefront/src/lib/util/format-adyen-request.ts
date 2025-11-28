import type { AddressData, PaymentData } from '@adyen/adyen-web'
import type { HttpTypes } from '@medusajs/types'
import { getBaseURL } from './env'

enum ChannelEnum {
  IOs = 'iOS',
  Android = 'Android',
  Web = 'Web',
}

enum RecurringProcessingModelEnum {
  CardOnFile = 'CardOnFile',
  Subscription = 'Subscription',
  UnscheduledCardOnFile = 'UnscheduledCardOnFile',
}
enum ShopperInteractionEnum {
  Ecommerce = 'Ecommerce',
  ContAuth = 'ContAuth',
  Moto = 'Moto',
  Pos = 'POS',
}

interface CartDetails extends Partial<PaymentData> {
  shopperConversionId?: string
  shopperEmail?: string
  telephoneNumber?: string
}

export interface AdyenRequest extends CartDetails {
  countryCode: string
  returnUrl: string
  channel?: ChannelEnum
  recurringProcessingModel?: RecurringProcessingModelEnum
  shopperInteraction?: ShopperInteractionEnum
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
  const match1 = trimmedAddress.match(pattern1)

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
  const match2 = trimmedAddress.match(pattern2)

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

const formatCartAddress = (
  address?: HttpTypes.StoreCartAddress,
): AddressData | undefined => {
  if (!address) return

  const { country_code, province, postal_code, city, address_1 } = address

  if (!country_code || !province || !postal_code || !city || !address_1) return

  const country = country_code.toUpperCase()
  const stateOrProvince = province
  const postalCode = postal_code
  const streetAddress = parseStreetAddress(address_1)

  const houseNumberOrName =
    streetAddress !== null ? streetAddress[0].toString() : ''

  const street = streetAddress !== null ? streetAddress[1] : ''

  return {
    city,
    country,
    houseNumberOrName,
    postalCode,
    stateOrProvince,
    street,
  }
}

const formatCartDetails = (cart?: HttpTypes.StoreCart): CartDetails => {
  if (!cart) return {}
  const {
    id: shopperConversionId,
    email: shopperEmail,
    shipping_address,
    billing_address,
  } = cart

  const billingAddress = formatCartAddress(billing_address)
  const deliveryAddress = formatCartAddress(shipping_address)
  const telephoneNumber = billing_address?.phone

  return {
    billingAddress,
    deliveryAddress,
    shopperConversionId,
    shopperEmail,
    telephoneNumber,
    // shopperIP, ??? Where do we get this data from?
  }
}

const formatReturnUrl = (countryCode: string, sessionId?: string): string => {
  const url = new URL(getBaseURL())
  url.pathname = `/${countryCode}/checkout/details`
  if (sessionId) url.searchParams.set('sessionId', sessionId)
  return url.toString()
}

export const formatAdyenRequest = (
  cart: HttpTypes.StoreCart,
  countryCode: string,
  sessionId?: string,
  payment: PaymentData | null = null,
  channel: ChannelEnum = ChannelEnum.Web,
  recurringProcessingModel: RecurringProcessingModelEnum = RecurringProcessingModelEnum.CardOnFile,
  shopperInteraction: ShopperInteractionEnum = ShopperInteractionEnum.Ecommerce,
): AdyenRequest => {
  const cartDetails = formatCartDetails(cart)
  const returnUrl = formatReturnUrl(countryCode, sessionId)

  return {
    ...cartDetails,
    ...payment,
    channel,
    countryCode,
    recurringProcessingModel,
    returnUrl,
    shopperInteraction,
  }
}

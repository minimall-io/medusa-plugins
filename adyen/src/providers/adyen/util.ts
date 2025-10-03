import { Types } from '@adyen/api-library'
import {
  AccountHolderDTO,
  BigNumberInput,
  PaymentProviderContext,
  PaymentProviderInput,
  PaymentSessionStatus,
  StoreCart,
  StoreCartAddress,
} from '@medusajs/framework/types'
import { BigNumber, MathBN } from '@medusajs/framework/utils'
import crypto from 'crypto'
import { CURRENCY_MULTIPLIERS } from './constants'

interface IData {
  payment?: Partial<Types.checkout.PaymentRequest> | null
  cart?: StoreCart
  ready?: boolean
  channel?: string
  session_id?: string
  idempotencyKey?: string
}

const capitalize = (currency: string): string => currency.toUpperCase()

const getCurrencyMultiplier = (currency: string) => {
  const currencyCode = capitalize(currency)
  const multiplier = CURRENCY_MULTIPLIERS[currencyCode]
  // Instead of using the default multiplier,
  // we may have to throw an error for unsupported currency.
  const defaultMultiplier = CURRENCY_MULTIPLIERS.DEFAULT
  const power = multiplier !== undefined ? multiplier : defaultMultiplier
  return Math.pow(10, power)
}

/**
 * Converts an amount to the format required by Adyen based on currency.
 * https://docs.adyen.com/development-resources/currency-codes
 * @param {BigNumberInput} amount - The amount to be converted.
 * @param {string} currency - The currency code (e.g., 'USD', 'JOD').
 * @returns {number} - The converted amount in the smallest currency unit.
 */
const getMinorUnit = (amount: BigNumberInput, currency: string): number => {
  const multiplier = getCurrencyMultiplier(currency)

  const formattedAmount =
    Math.round(new BigNumber(MathBN.mult(amount, multiplier)).numeric) /
    multiplier

  const smallestAmount = new BigNumber(MathBN.mult(formattedAmount, multiplier))
  const { numeric } = smallestAmount
  const nearestTenNumeric = Math.ceil(numeric / 10) * 10

  // Check if the currency requires rounding to the nearest ten
  const numericAmount = multiplier === 1e3 ? nearestTenNumeric : numeric

  return parseInt(numericAmount.toString().split('.').shift()!, 10)
}

/**
 * Converts an amount from the minor currency unit to the standard unit based on currency.
 * @param {BigNumberInput} amount - The amount in the smallest currency unit.
 * @param {string} currency - The currency code (e.g., 'USD', 'JOD').
 * @returns {number} - The converted amount in the standard currency unit.
 */
export function getAmountFromMinorUnit(
  amount: BigNumberInput,
  currency: string,
): number {
  const multiplier = getCurrencyMultiplier(currency)
  const standardAmount = new BigNumber(MathBN.div(amount, multiplier))
  const { numeric } = standardAmount
  return numeric
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

const getAmount = (
  amount: number,
  currency: string,
): Types.checkout.Amount => ({
  currency: capitalize(currency),
  value: getMinorUnit(amount, currency),
})

const getBillingAddress = (
  country: string,
  stateOrProvince: string,
  postalCode: string,
  city: string,
  address: string,
): Types.checkout.BillingAddress => {
  const streetAddress = parseStreetAddress(address)

  const houseNumberOrName =
    streetAddress !== null ? streetAddress[0].toString() : ''

  const street = streetAddress !== null ? streetAddress[1] : ''

  return {
    country: capitalize(country),
    stateOrProvince,
    postalCode,
    city,
    houseNumberOrName,
    street,
  }
}

const getCartBillingAddressDetails = (
  billingAddress?: StoreCartAddress,
): Types.checkout.PaymentRequest['billingAddress'] | null => {
  if (
    !billingAddress ||
    !billingAddress.country_code ||
    !billingAddress.province ||
    !billingAddress.postal_code ||
    !billingAddress.city ||
    !billingAddress.address_1
  )
    return null

  return getBillingAddress(
    billingAddress.country_code,
    billingAddress.province,
    billingAddress.postal_code,
    billingAddress.city,
    billingAddress.address_1,
  )
}

const getCartDetails = (
  cart?: StoreCart,
): Partial<Types.checkout.PaymentRequest> | null => {
  if (!cart) return null

  const { id, email, shipping_address, billing_address, total, currency_code } =
    cart
  const { phone, country_code } = shipping_address || {}

  const amount = getAmount(total, currency_code)
  const shopperConversionId = id
  const shopperEmail = email
  const telephoneNumber = phone
  const countryCode = country_code && capitalize(country_code)
  const billingAddress = getCartBillingAddressDetails(billing_address)

  return {
    amount,
    shopperConversionId,
    shopperEmail,
    telephoneNumber,
    countryCode,
    billingAddress,
    // shopperIP, ??? Where do we get this data from?
  }
}

const getPaymentDetails = (
  payment?: Partial<Types.checkout.PaymentRequest> | null,
): Partial<Types.checkout.PaymentRequest> | null => {
  if (!payment) return null
  return { ...payment }
}

const getContextDetails = (
  context?: PaymentProviderContext,
): Partial<Types.checkout.PaymentRequest> | null => {
  if (!context || !context.account_holder) return null
  const { account_holder } = context
  const accountHolder = account_holder as AccountHolderDTO
  const shopperReference = accountHolder.id
  return { shopperReference }
}

const getChannel = (
  rawChannel?: string,
): Partial<Types.checkout.PaymentRequest> | null => {
  if (!rawChannel) return null
  const channel = rawChannel as Types.checkout.PaymentMethodsRequest.ChannelEnum
  return { channel }
}

const getInputData = (input: PaymentProviderInput): IData =>
  input?.data as IData

const getInputContext = (input: PaymentProviderInput): PaymentProviderContext =>
  input?.context as PaymentProviderContext

export const resolvePaymentSessionStatus = (
  code?: Types.checkout.PaymentResponse.ResultCodeEnum,
): PaymentSessionStatus => {
  const Codes = Types.checkout.PaymentResponse.ResultCodeEnum
  switch (code) {
    case Codes.AuthenticationFinished:
    case Codes.AuthenticationNotRequired:
    case Codes.PartiallyAuthorised:
    case Codes.Authorised:
      return 'authorized'
    case Codes.Cancelled:
      return 'canceled'
    case Codes.ChallengeShopper:
    case Codes.IdentifyShopper:
    case Codes.PresentToShopper:
    case Codes.RedirectShopper:
      return 'requires_more'
    case Codes.Error:
      return 'error'
    case Codes.Received:
    case Codes.Pending:
      return 'pending'
    case Codes.Refused:
      return 'error'
    case Codes.Success:
      return 'captured'
    default:
      return 'error' // Default to error for unhandled cases
  }
}

export const getIdempotencyKey = (input: PaymentProviderInput): string => {
  const data = getInputData(input)
  const context = getInputContext(input)
  console.log(
    'getIdempotencyKey/data/idempotencyKey',
    JSON.stringify(data?.idempotencyKey, null, 2),
  )
  console.log(
    'getIdempotencyKey/context/idempotency_key',
    JSON.stringify(context?.idempotency_key, null, 2),
  )
  console.log(
    'getIdempotencyKey/data/session_id',
    JSON.stringify(data?.session_id, null, 2),
  )
  console.log(
    'getIdempotencyKey/data/cart/id',
    JSON.stringify(data?.cart?.id, null, 2),
  )
  if (data.idempotencyKey) return data.idempotencyKey
  if (context.idempotency_key) return context.idempotency_key
  if (data.session_id) return data.session_id
  if (data.cart?.id) return data.cart.id
  return crypto.randomUUID()
}

export const getPaymentOptions = (input: PaymentProviderInput) => ({
  idempotencyKey: getIdempotencyKey(input),
})

export const getPaymentMethodsRequest = (
  merchantAccount: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentMethodsRequest => {
  const data = getInputData(input)
  const context = getInputContext(input)

  const channelDetails = getChannel(data?.channel)
  const cartDetails = getCartDetails(data?.cart)
  const paymenDetails = getPaymentDetails(data?.payment)
  const contextDetails = getContextDetails(context)

  const request: Types.checkout.PaymentMethodsRequest = {
    ...channelDetails,
    ...cartDetails,
    ...paymenDetails,
    ...contextDetails,
    merchantAccount,
  }

  console.log(
    'getPaymentMethodsRequest/request',
    JSON.stringify(request, null, 2),
  )

  return request
}

export const getPaymentRequest = (
  merchantAccount: string,
  returnUrl: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentRequest => {
  const data = getInputData(input)
  const context = getInputContext(input)

  const channelDetails = getChannel(data?.channel)
  const cartDetails = getCartDetails(data?.cart)
  const paymenDetails = getPaymentDetails(data?.payment)
  const contextDetails = getContextDetails(context)

  const reference = getIdempotencyKey(input)

  if (!channelDetails || !cartDetails || !paymenDetails) {
    throw new Error('Missing data for generating payment request!')
  }

  if (!cartDetails.amount) {
    throw new Error('Missing amount for generating payment request!')
  }

  if (!cartDetails.shopperEmail) {
    throw new Error('Missing shopper email for generating payment request!')
  }

  if (!cartDetails.billingAddress) {
    throw new Error('Missing billing address for generating payment request!')
  }

  if (!paymenDetails.paymentMethod) {
    throw new Error('Missing payment method for generating payment request!')
  }

  const { amount } = cartDetails

  const { paymentMethod } = paymenDetails

  const request: Types.checkout.PaymentRequest = {
    ...channelDetails,
    ...cartDetails,
    ...paymenDetails,
    ...contextDetails,
    merchantAccount,
    returnUrl,
    reference,
    amount,
    paymentMethod,
  }

  console.log('getPaymentRequest/request', JSON.stringify(request, null, 2))

  return request
}

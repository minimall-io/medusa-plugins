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
import { BigNumber, MathBN, MedusaError } from '@medusajs/framework/utils'
import { CURRENCY_MULTIPLIERS } from './constants'

interface ITransientData {
  sessionId: string
  paymentResponse: Partial<Types.checkout.PaymentResponse> | null
}

interface IData extends Partial<ITransientData> {
  payment?: Partial<Types.checkout.PaymentRequest> | null
  paymentResponse?: Partial<Types.checkout.PaymentResponse> | null
  cart?: StoreCart
  ready?: boolean
  channel?: string
  session_id?: string
}

const capitalize = (currency: string): string => currency.toUpperCase()

const getCurrencyMultiplier = (currency: string): number => {
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

const getCartBillingAddressDetails = (
  billingAddress?: StoreCartAddress,
): Types.checkout.BillingAddress | null => {
  if (!billingAddress) return null

  const { country_code, province, postal_code, city, address_1 } =
    billingAddress

  if (!country_code || !province || !postal_code || !city || !address_1)
    return null

  const country = capitalize(country_code)
  const stateOrProvince = province
  const postalCode = postal_code
  const streetAddress = parseStreetAddress(address_1)

  const houseNumberOrName =
    streetAddress !== null ? streetAddress[0].toString() : ''

  const street = streetAddress !== null ? streetAddress[1] : ''

  return {
    country,
    stateOrProvince,
    postalCode,
    city,
    houseNumberOrName,
    street,
  }
}

const getDataPaymentRequest = (
  data?: IData,
): Partial<Types.checkout.PaymentRequest> => {
  let request: Partial<Types.checkout.PaymentRequest> = {}

  if (!data) return request
  const { channel: paymentChannel, payment, cart } = data

  if (paymentChannel) {
    const channel =
      paymentChannel as Types.checkout.PaymentMethodsRequest.ChannelEnum
    request = { ...request, channel }
  }

  if (payment) {
    request = { ...request, ...payment }
  }

  if (cart) {
    const {
      id,
      email,
      shipping_address,
      billing_address,
      total,
      currency_code,
    } = cart
    const { phone, country_code } = shipping_address || {}

    const amount: Types.checkout.Amount = {
      currency: capitalize(currency_code),
      value: getMinorUnit(total, currency_code),
    }
    const shopperConversionId = id
    const shopperEmail = email
    const telephoneNumber = phone
    const countryCode = country_code && capitalize(country_code)
    const billingAddress = getCartBillingAddressDetails(billing_address)

    request = {
      ...request,
      amount,
      shopperConversionId,
      shopperEmail,
      telephoneNumber,
      countryCode,
      billingAddress,
      // shopperIP, ??? Where do we get this data from?
    }
  }

  return request
}

const getContextPaymentRequest = (
  context?: PaymentProviderContext,
): Partial<Types.checkout.PaymentRequest> => {
  let request: Partial<Types.checkout.PaymentRequest> = {}
  if (!context || !context.account_holder) return request
  const { account_holder } = context
  const accountHolder = account_holder as AccountHolderDTO
  const shopperReference = accountHolder.id
  return { shopperReference }
}

const getDataPaymentResponse = (
  data?: IData,
): Partial<Types.checkout.PaymentResponse & { reference?: string }> | null => {
  if (!data || !data.paymentResponse) return null
  const { paymentResponse } = data
  return { ...paymentResponse, reference: paymentResponse.merchantReference }
}

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

export const getTransientData = (
  input: PaymentProviderInput,
): ITransientData => {
  const data = input?.data ? (input.data as IData) : undefined
  const context = input?.context
    ? (input.context as PaymentProviderContext)
    : undefined

  const paymentResponse = data?.paymentResponse || null
  const sessionId =
    data?.sessionId || data?.session_id || context?.idempotency_key

  if (!sessionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'No session ID could be extracted!',
    )
  }

  return {
    paymentResponse,
    sessionId,
  }
}

export const getPaymentMethodsRequest = (
  merchantAccount: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentMethodsRequest => {
  const data = getDataPaymentRequest(input?.data)
  const context = getContextPaymentRequest(input?.context)

  const {
    channel,
    amount,
    shopperConversionId,
    shopperEmail,
    telephoneNumber,
    countryCode,
    browserInfo,
  } = data

  const { shopperReference } = context

  const request: Types.checkout.PaymentMethodsRequest = {
    channel,
    amount,
    shopperConversionId,
    shopperReference,
    shopperEmail,
    telephoneNumber,
    countryCode,
    browserInfo,
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
  const data = getDataPaymentRequest(input?.data)
  const context = getContextPaymentRequest(input?.context)
  const { sessionId: reference } = getTransientData(input)

  if (!data.channel) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing data for generating payment request!',
    )
  }

  if (!data.amount) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing amount for generating payment request!',
    )
  }

  if (!data.shopperEmail) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing shopper email for generating payment request!',
    )
  }

  if (!data.billingAddress) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing billing address for generating payment request!',
    )
  }

  if (!data.paymentMethod) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing payment method for generating payment request!',
    )
  }

  const { amount, paymentMethod } = data

  const request: Types.checkout.PaymentRequest = {
    ...data,
    ...context,
    merchantAccount,
    returnUrl,
    reference,
    amount,
    paymentMethod,
  }

  console.log('getPaymentRequest/request', JSON.stringify(request, null, 2))

  return request
}

export const getPaymentCaptureRequest = (
  merchantAccount: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentCaptureRequest => {
  const data = getDataPaymentResponse(input?.data)

  if (!data || !data.amount || !data.reference || !data.pspReference) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing data for generating payment capture request!',
    )
  }

  const { amount, reference } = data

  const request: Types.checkout.PaymentCaptureRequest = {
    merchantAccount,
    reference,
    amount,
  }

  console.log(
    'getPaymentCaptureRequest/request',
    JSON.stringify(request, null, 2),
  )

  return request
}

export const getPaymentCancelRequest = (
  merchantAccount: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentCancelRequest => {
  const data = getDataPaymentResponse(input?.data)

  if (!data || !data.reference || !data.pspReference) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing data for generating payment cancel request!',
    )
  }

  const { reference } = data

  const request: Types.checkout.PaymentCancelRequest = {
    merchantAccount,
    reference,
  }

  console.log(
    'getPaymentCancelRequest/request',
    JSON.stringify(request, null, 2),
  )

  return request
}

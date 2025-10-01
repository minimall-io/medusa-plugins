import { Types } from '@adyen/api-library'
import {
  AccountHolderDTO,
  BigNumberInput,
  PaymentProviderContext,
  PaymentSessionStatus,
  StoreCart,
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
}

export const getCurrencyMultiplier = (currency: string) => {
  const currencyCode = currency.toUpperCase()
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
export const getMinorUnit = (
  amount: BigNumberInput,
  currency: string,
): number => {
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

export const resolvePaymentSessionStatus = (
  code?: Types.checkout.PaymentResponse.ResultCodeEnum,
): PaymentSessionStatus => {
  const Codes = Types.checkout.PaymentResponse.ResultCodeEnum
  switch (code) {
    case undefined:
      return 'error'
    case Codes.AuthenticationFinished:
    case Codes.AuthenticationNotRequired:
    case Codes.Authorised:
      return 'authorized'
    case Codes.Cancelled:
      return 'canceled'
    case Codes.ChallengeShopper:
      return 'requires_more'
    case Codes.Error:
      return 'error'
    case Codes.IdentifyShopper:
      return 'requires_more'
    case Codes.PartiallyAuthorised:
      return 'authorized'
    case Codes.Pending:
      return 'pending'
    case Codes.PresentToShopper:
      return 'requires_more'
    case Codes.Received:
      return 'pending'
    case Codes.RedirectShopper:
      return 'requires_more'
    case Codes.Refused:
      return 'error'
    case Codes.Success:
      return 'captured'
    default:
      return 'error' // Default to error for unhandled cases
  }
}

export const getIdempotencyKey = (data?: IData) =>
  data?.session_id || crypto.randomUUID()

export const getPaymentMethodsOptions = (data?: IData) => ({
  idempotencyKey: getIdempotencyKey(data),
})

export const getPaymentMethodsRequest = (
  merchantAccount: string,
  data?: IData,
  context?: PaymentProviderContext,
): Types.checkout.PaymentMethodsRequest => {
  const request: Types.checkout.PaymentMethodsRequest = {
    merchantAccount,
  }

  if (!data) return request

  const { cart, payment, channel } = data

  request.channel = channel as Types.checkout.PaymentMethodsRequest.ChannelEnum

  if (cart) {
    const amount: Types.checkout.Amount = {
      currency: cart.currency_code,
      value: getMinorUnit(cart.total, cart.currency_code), // format the value
    }
    request.amount = amount
    request.shopperConversionId = cart.id
    request.shopperEmail = cart.email
    // request.shopperIP = ??? Where do we get this data from?
    request.telephoneNumber = cart.shipping_address?.phone
    request.countryCode = cart.shipping_address?.country_code
  }

  if (payment) {
    request.browserInfo = payment.browserInfo
  }

  if (context) {
    request.shopperReference = (
      context.account_holder as AccountHolderDTO | undefined
    )?.id
  }

  console.log('getPaymentMethodsRequest/request', JSON.stringify(request))

  return request

  //   const idempotencyKey = 'null' // source: `input?.data?.session_id
  //   const request: Types.checkout.PaymentMethodsRequest = {
  //     additionalData, // ? source: `input?.data?.cart`
  //     allowedPaymentMethods, // This data should come from the store operator.
  //     blockedPaymentMethods, // This data should come from the store operator.
  //     order, // ? source: `input?.data?.cart`
  //     shopperIP, // source: ???
  //     shopperLocale, // source: ???
  //     splitCardFundingSources, // ?
  //     store, // ???
  //   }

  //   const idempotencyKey = 'null' // source: `input?.data?.session_id
  //   const request: Types.checkout.PaymentMethodsRequest = {
  //     additionalData, // ? source: `input?.data?.cart`
  //     allowedPaymentMethods, // This data should come from the store operator.
  //     amount, // source: `{ currency: input.currency_code, value: input.amount }`
  //     blockedPaymentMethods, // This data should come from the store operator.
  //     browserInfo, // source: `input?.data?.payment?.browserInfo`
  //     channel, // source: `input?.data?.channel`
  //     countryCode, // source: `input?.data?.cart?.shipping_address?.country_code` | `input?.data?.cart.billing_address?.country_code`
  //     merchantAccount: this.options_.merchantAccount,
  //     order, // ? source: `input?.data?.cart`
  //     shopperConversionId, // source: `input?.data?.cart.id` Providers insights into conversion rate as long as it's unique across api calls.
  //     shopperEmail, // source: `input?.data?.cart?.email`
  //     shopperIP, // source: ???
  //     shopperLocale, // source: ???
  //     shopperReference, // source: `input.context.account_holder.id`  To store the payment method
  //     splitCardFundingSources, // ?
  //     store, // ???
  //     telephoneNumber, // source: `input?.data?.cart?.shipping_address?.phone` | `input?.data?.cart?.billing_address?.phone`
  //   }
}

// export const getPaymentRequest = (
//   merchantAccount: string,
//   data?: IData,
//   context?: PaymentProviderContext,
// ): Types.checkout.PaymentRequest | null => {
//   if (!data || !data.cart || !data.payment) return null

//   const { cart, payment, channel } = data

//   const amount: Types.checkout.Amount = {
//     currency: cart.currency_code,
//     value: cart.total, // format the value
//   }

//   const request: Types.checkout.PaymentRequest = {
//     accountInfo, // ? Shopper account
//     additionalAmount, // ? The same type as the `amount`
//     additionalData, // ? May be required by a particualr payment request
//     amount, // source: `{ currency: input.currency_code, value: input.amount }`
//     applicationInfo, // ?
//     authenticationData, // ? related to 3D Secure authentication
//     bankAccount, // ?
//     billingAddress, // source: `data.cart.billing_address` - needs formatting
//     browserInfo, // source: `data.payment.browserInfo`
//     captureDelayHours, // ? delay between the authorisation and scheduled auto-capture
//     channel, // source: `data.channel`
//     checkoutAttemptId, // ? Id generated by the client SDK for tracking user payment journey
//     company, // ?
//     conversionId, // deprecated - use `checkoutAttemptId` instead
//     countryCode, // ? shopper country
//     dateOfBirth, // ? shoppers date of birth
//     dccQuote, // ?
//     deliverAt, // ? date to deliver the order
//     deliveryAddress, // source: `data.cart.shipping_address` - needs formatting
//     deliveryDate, // deprecated - use `deliverAt` instead
//     deviceFingerprint, // https://docs.adyen.com/risk-management/device-fingerprinting
//     enableOneClick, // when true and `shopperReference` is provided, the shopper will be asked to save the payment data for future
//     enablePayOut, // when true and `shopperReference` is provided, the payment details will be tokenized for payouts
//     enableRecurring, // when true and `shopperReference` is provided, the payment data will be saved for reccuring payments
//     enhancedSchemeData, // ?
//     entityType, // ? company or individual `EntityTypeEnum`
//     fraudOffset, // ? fraud score, can be positive or negative
//     fundOrigin, // ?
//     fundRecipient, // ?
//     industryUsage, // ?
//     installments, // ?
//     lineItems, // ? required for some payment types
//     localizedShopperStatement, // ?
//     mandate, // ?
//     mcc, // ?
//     merchantAccount, // *
//   }

//   return request
// }

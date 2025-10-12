import { Types } from '@adyen/api-library'
import { BigNumberInput, PaymentSessionStatus } from '@medusajs/framework/types'
import { BigNumber, MathBN } from '@medusajs/framework/utils'
import { CURRENCY_MULTIPLIERS } from './constants'

const getCurrencyMultiplier = (currency: string): number => {
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

export const getSessionStatus = (
  code?: Types.checkout.SessionResultResponse.StatusEnum,
): PaymentSessionStatus => {
  const codes = Types.checkout.SessionResultResponse.StatusEnum
  switch (code) {
    // https://docs.adyen.com/api-explorer/Checkout/71/get/sessions/(sessionId)
    case codes.Active:
    case codes.PaymentPending:
      return 'pending'
    case codes.Canceled:
      return 'canceled'
    case codes.Completed:
      return 'authorized'
    case codes.Expired:
    case codes.Refused:
      return 'error'
    default:
      return 'error' // Default to error for unhandled cases
  }
}

export const getStoredPaymentMethod = (
  method: Types.checkout.StoredPaymentMethod,
  index: number,
) => ({
  id: method.id || index.toString(),
  data: method as Record<string, unknown>,
})

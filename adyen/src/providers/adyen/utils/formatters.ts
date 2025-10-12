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

export const getPaymentSessionStatus = (
  code?: Types.checkout.PaymentResponse.ResultCodeEnum,
): PaymentSessionStatus => {
  const codes = Types.checkout.PaymentResponse.ResultCodeEnum
  switch (code) {
    // https://docs.adyen.com/online-payments/build-your-integration/payment-result-codes/
    // Final state result
    case codes.Success: // Not documented.
      return 'captured'
    case codes.Authorised: // Inform the shopper that the payment was successful.
      return 'authorized'
    case codes.Cancelled: // Inform the shopper that their payment was cancelled and check if they want to continue with their order.
      return 'canceled'
    case codes.Error: // Inform the shopper that there was an error processing their payment.
    case codes.Refused: // Inform the shopper that their payment was refused and ask them to try the payment again, for example, by using a different payment method or card.
      return 'error'
    // Partial authorisation result
    case codes.PartiallyAuthorised: // Inform the shopper that their payment has been partially authorised.
      return 'authorized'
    // Intermediate result
    case codes.Received: // Inform the shopper that you have received their order, and are waiting for the final payment status.
    case codes.Pending: // Inform the shopper that you have received their order, and are waiting for the shopper to complete the payment.
      return 'pending'
    case codes.PresentToShopper: // Present the voucher to the shopper, and inform the shopper that you are waiting for them to complete the payment.
      return 'requires_more'
    // 3D Secure 2 authentication result
    case codes.ChallengeShopper: // Initiate the challenge flow to present the challenge to the shopper, and submit the result to Adyen.
    case codes.IdentifyShopper: // Initiate the frictionless flow to get the shopper's device fingerprint, and submit the result to Adyen.
    case codes.RedirectShopper: // Redirect the shopper to complete the authentication.
      return 'requires_more'
    // Authentication-only result
    case codes.AuthenticationNotRequired: // Proceed to authorise the payment.
    case codes.AuthenticationFinished: // Collect the 3D Secure 2 authentication data that you need to authorise the payment.
      return 'authorized'
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

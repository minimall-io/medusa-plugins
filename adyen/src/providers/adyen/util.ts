import { Types } from '@adyen/api-library'
import {
  AccountHolderDTO,
  BigNumberInput,
  InitiatePaymentInput,
  PaymentProviderContext,
  PaymentProviderInput,
  PaymentSessionStatus,
  RefundPaymentInput,
} from '@medusajs/framework/types'
import { BigNumber, MathBN } from '@medusajs/framework/utils'
import { CURRENCY_MULTIPLIERS } from './constants'
import {
  Data,
  TransientData,
  validateAmount,
  validateData,
  validatePaymentCaptureResponse,
  validatePaymentMethodsRequest,
  validatePaymentRequest,
  validatePaymentResponse,
  validateTransientData,
} from './validators'

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

const getInputData = (input: PaymentProviderInput): Data =>
  validateData(input.data)

const getInputContext = (
  input: PaymentProviderInput,
): PaymentProviderContext | undefined =>
  input?.context ? (input.context as PaymentProviderContext) : undefined

const getContextShopperReference = (
  context?: PaymentProviderContext,
): string | undefined => {
  if (!context || !context.account_holder) return
  const { account_holder } = context
  const accountHolder = account_holder as AccountHolderDTO
  return accountHolder.id
}

export const getPaymentSessionStatus = (
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

export const getInputTransientData = (
  input: PaymentProviderInput,
): TransientData => {
  const data = getInputData(input)
  const context = getInputContext(input)

  const paymentResponse = data?.paymentResponse || null
  const paymentCaptureResponse = data?.paymentCaptureResponse || null
  const sessionId =
    data?.sessionId || data?.session_id || context?.idempotency_key

  const transientData = validateTransientData({
    sessionId,
    paymentResponse,
    paymentCaptureResponse,
  })

  console.log(
    'getInputTransientData/transientData',
    JSON.stringify(transientData, null, 2),
  )

  return transientData
}

export const getListPaymentMethodsRequest = (
  merchantAccount: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentMethodsRequest => {
  const data = getInputData(input)
  const context = getInputContext(input)

  const dataPaymentRequest = validatePaymentMethodsRequest({
    ...data?.paymentRequest,
    merchantAccount,
  })
  const shopperReference = getContextShopperReference(context)

  return {
    ...dataPaymentRequest,
    shopperReference,
  }
}

export const getInitiatePaymentRequest = (
  merchantAccount: string,
  returnUrl: string,
  input: InitiatePaymentInput,
): Types.checkout.PaymentMethodsRequest => {
  const data = getInputData(input)
  const context = getInputContext(input)

  const { sessionId: reference } = getInputTransientData(input)

  const { currency_code, amount: total } = input
  const currency = currency_code.toUpperCase()
  const value = getMinorUnit(total, currency_code)
  const amount = validateAmount({
    currency,
    value,
  })

  const dataPaymentRequest = validatePaymentRequest({
    ...data?.paymentRequest,
    amount,
    reference,
    returnUrl,
    merchantAccount,
  })
  const shopperReference = getContextShopperReference(context)

  return {
    ...dataPaymentRequest,
    shopperReference,
  }
}

export const getAuthorizePaymentRequest = (
  merchantAccount: string,
  returnUrl: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentRequest => {
  const data = getInputData(input)
  const context = getInputContext(input)

  const { sessionId: reference } = getInputTransientData(input)

  const dataPaymentRequest = validatePaymentRequest({
    ...data?.paymentRequest,
    reference,
    returnUrl,
    merchantAccount,
  })
  const shopperReference = getContextShopperReference(context)

  return {
    ...dataPaymentRequest,
    shopperReference,
  }
}

export const getCapturePaymentRequest = (
  merchantAccount: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentCaptureRequest => {
  const data = getInputData(input)

  const paymentResponse = validatePaymentResponse({
    ...data?.paymentResponse,
    merchantAccount,
  })
  const reference = paymentResponse.merchantReference

  return {
    ...paymentResponse,
    reference,
    merchantAccount,
  }
}

export const getCancelPaymentRequest = (
  merchantAccount: string,
  input: PaymentProviderInput,
): Types.checkout.PaymentCancelRequest => {
  const data = getInputData(input)

  const paymentResponse = validatePaymentResponse({
    ...data?.paymentResponse,
    merchantAccount,
  })
  const reference = paymentResponse.merchantReference

  return {
    merchantAccount,
    reference,
  }
}

export const getRefundPaymentRequest = (
  merchantAccount: string,
  input: RefundPaymentInput,
): Types.checkout.PaymentRefundRequest => {
  const data = getInputData(input)

  const paymentCaptureResponse = validatePaymentCaptureResponse({
    ...data?.paymentCaptureResponse,
    merchantAccount,
  })

  const capturePspReference = paymentCaptureResponse.pspReference
  const reference = paymentCaptureResponse.reference

  const currency = paymentCaptureResponse.amount.currency.toUpperCase()
  const value = getMinorUnit(input.amount, currency)
  const amount = validateAmount({
    currency,
    value,
  })

  return {
    merchantAccount,
    capturePspReference,
    reference,
    amount,
  }
}

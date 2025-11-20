import type { BigNumberInput, PaymentDTO } from '@medusajs/framework/types'
import { BigNumber, MathBN } from '@medusajs/framework/utils'
import { cloneDeep, filter, find } from 'lodash'
import { CURRENCY_MULTIPLIERS } from './constants'
import type { PaymentModification, PaymentModificationData } from './types'
import {
  validatePartialPaymentModificationData,
  validatePaymentModification,
  validatePaymentModificationData,
} from './validators'

const getCurrencyMultiplier = (currency: string): number => {
  const currencyCode = currency.toUpperCase()
  const multiplier = CURRENCY_MULTIPLIERS[currencyCode]
  // Instead of using the default multiplier,
  // we may have to throw an error for unsupported currency.
  const defaultMultiplier = CURRENCY_MULTIPLIERS.DEFAULT
  const power = multiplier !== undefined ? multiplier : defaultMultiplier
  return 10 ** power
}

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

export const getWholeUnit = (
  amount: BigNumberInput,
  currency: string,
): number => {
  const multiplier = getCurrencyMultiplier(currency)
  const standardAmount = new BigNumber(MathBN.div(amount, multiplier))
  return standardAmount.numeric
}

export const managePaymentData = (data: PaymentDTO['data']) => {
  const paymentModificationData = validatePaymentModificationData(
    cloneDeep(data),
  )
  const captures = paymentModificationData?.captures || []
  const refunds = paymentModificationData?.refunds || []
  const cancellation = paymentModificationData?.cancellation

  const getData = (): PaymentDTO['data'] => {
    return paymentModificationData as PaymentDTO['data']
  }

  const updateData = (
    newData: Partial<PaymentModificationData>,
  ): PaymentDTO['data'] => {
    const validData = validatePartialPaymentModificationData(newData)
    return { ...paymentModificationData, ...validData } as PaymentDTO['data']
  }

  const getCancellation = (): PaymentModification | undefined => cancellation

  const updateCancellation = (
    newCancellation: PaymentModification,
  ): PaymentDTO['data'] => {
    const validCancellation = validatePaymentModification(newCancellation)
    return {
      ...paymentModificationData,
      cancellation: validCancellation,
    } as PaymentDTO['data']
  }

  const deleteCancellation = (): PaymentDTO['data'] => {
    return {
      ...paymentModificationData,
      cancellation: undefined,
    } as PaymentDTO['data']
  }

  const listCaptures = (): PaymentModification[] => captures

  const getCapture = (pspReference: string): PaymentModification | undefined =>
    find(captures, { pspReference })

  const updateCapture = (
    newCapture: PaymentModification,
  ): PaymentDTO['data'] => {
    const validCapture = validatePaymentModification(newCapture)
    const { pspReference } = validCapture
    const otherCaptures = filter(
      captures,
      (capture) => capture.pspReference !== pspReference,
    )
    const newCaptures = [...otherCaptures, validCapture]
    return {
      ...paymentModificationData,
      captures: newCaptures,
    } as PaymentDTO['data']
  }

  const deleteCapture = (pspReference: string): PaymentDTO['data'] => {
    const otherCaptures = filter(
      captures,
      (capture) => capture.pspReference !== pspReference,
    )
    return {
      ...paymentModificationData,
      captures: otherCaptures,
    } as PaymentDTO['data']
  }

  const listRefunds = (): PaymentModification[] => refunds

  const getRefund = (pspReference: string): PaymentModification | undefined =>
    find(refunds, { pspReference })

  const updateRefund = (newRefund: PaymentModification): PaymentDTO['data'] => {
    const validRefund = validatePaymentModification(newRefund)
    const { pspReference } = validRefund
    const otherRefunds = filter(
      refunds,
      (refund) => refund.pspReference !== pspReference,
    )
    const newRefunds = [...otherRefunds, validRefund]
    return {
      ...paymentModificationData,
      refunds: newRefunds,
    } as PaymentDTO['data']
  }

  const deleteRefund = (pspReference: string): PaymentDTO['data'] => {
    const otherRefunds = filter(
      refunds,
      (refund) => refund.pspReference !== pspReference,
    )
    return {
      ...paymentModificationData,
      refunds: otherRefunds,
    } as PaymentDTO['data']
  }

  return {
    deleteCancellation,
    deleteCapture,
    deleteRefund,
    getCancellation,
    getCapture,
    getData,
    getRefund,
    listCaptures,
    listRefunds,
    updateCancellation,
    updateCapture,
    updateData,
    updateRefund,
  }
}

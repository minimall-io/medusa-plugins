import type { BigNumberInput, PaymentDTO } from '@medusajs/framework/types'
import { BigNumber, MathBN } from '@medusajs/framework/utils'
import { cloneDeep } from 'lodash'
import { CURRENCY_MULTIPLIERS } from './constants'

import type { PaymentModification, PaymentModificationData } from './types'

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
  const paymentModificationData = cloneDeep(data) as PaymentModificationData
  const captures = paymentModificationData?.captures || []

  const getData = (): PaymentDTO['data'] => {
    return paymentModificationData as PaymentDTO['data']
  }

  const updateData = (
    newData: Partial<PaymentModificationData>,
  ): PaymentDTO['data'] => {
    return { ...paymentModificationData, ...newData } as PaymentDTO['data']
  }

  const listCaptures = (): PaymentModification[] => captures

  const getCapture = (pspReference: string): PaymentModification | undefined =>
    captures.find((capture) => capture.pspReference === pspReference)

  const updateCapture = (
    newCapture: PaymentModification,
  ): PaymentDTO['data'] => {
    const otherCaptures = captures.filter(
      (capture) => capture.pspReference !== newCapture.pspReference,
    )
    const newCaptures = [...otherCaptures, newCapture]
    return { ...data, captures: newCaptures } as PaymentDTO['data']
  }

  const deleteCapture = (pspReference: string): PaymentDTO['data'] => {
    const otherCaptures = captures.filter(
      (capture) => capture.pspReference !== pspReference,
    )
    return { ...data, captures: otherCaptures } as PaymentDTO['data']
  }

  return {
    deleteCapture,
    getCapture,
    getData,
    listCaptures,
    updateCapture,
    updateData,
  }
}

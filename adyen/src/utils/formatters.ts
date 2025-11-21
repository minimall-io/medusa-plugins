import type { BigNumberInput, PaymentDTO } from '@medusajs/framework/types'
import { BigNumber, MathBN } from '@medusajs/framework/utils'
import { cloneDeep, filter, find } from 'lodash'
import { CURRENCY_MULTIPLIERS } from './constants'
import type { Data, Event } from './types'
import { validateData, validateEvent, validatePartialData } from './validators'

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

export const PaymentDataManager = (data: PaymentDTO['data']) => {
  let validData = validateData(cloneDeep(data))

  const getData = (): Data => validData

  const getEvents = (): Event[] => validData.events || []

  const getAuthorisation = (): Event =>
    find(getEvents(), { name: 'AUTHORISATION' })

  const getCancellation = (): Event[] =>
    find(getEvents(), { name: 'CANCELLATION' })

  const getCaptures = (): Event[] => filter(getEvents(), { name: 'CAPTURE' })

  const getRefunds = (): Event[] => filter(getEvents(), { name: 'REFUND' })

  const getEvent = (providerReference: string): Event | undefined =>
    find(getEvents(), { providerReference })

  const setData = (newData: Partial<Data>): void => {
    const newValidData = validatePartialData(newData)
    validData = { ...validData, ...newValidData }
  }

  const setAuthorisation = (newAuthorisation: Event): void => {
    const authorisation = validateEvent(newAuthorisation)
    const otherEvents = filter(
      getEvents(),
      (event: Event) => event.name !== 'AUTHORISATION',
    )
    const events = [...otherEvents, authorisation]
    setData({ events })
  }

  const setEvent = (newEvent: Event): void => {
    const event = validateEvent(newEvent)
    const { providerReference } = event
    const otherEvents = filter(
      getEvents(),
      (event: Event) => event.providerReference !== providerReference,
    )
    const events = [...otherEvents, event]
    setData({ events })
  }

  const deleteEvent = (providerReference: string): void => {
    const events = filter(
      getEvents(),
      (event: Event) => event.providerReference !== providerReference,
    )
    setData({ events })
  }

  return {
    deleteEvent,
    getAuthorisation,
    getCancellation,
    getCaptures,
    getData,
    getEvent,
    getEvents,
    getRefunds,
    setAuthorisation,
    setData,
    setEvent,
  }
}

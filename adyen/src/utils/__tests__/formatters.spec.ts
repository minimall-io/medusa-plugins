import {
  getMinorUnit,
  getWholeUnit,
  PaymentDataManager,
  roundToCurrencyPrecision,
} from '../'

import { getData, getEvent } from './fixtures'

describe('Formatters', () => {
  describe('getMinorUnit', () => {
    it('should return the minor unit of the amount', () => {
      const amount = 29.95
      const currency = 'USD'
      const minorUnit = getMinorUnit(amount, currency)
      expect(minorUnit).toBe(2995)
    })
  })

  describe('getWholeUnit', () => {
    it('should return the whole unit of the amount', () => {
      const amount = 2995
      const currency = 'USD'
      const wholeUnit = getWholeUnit(amount, currency)
      expect(wholeUnit).toBe(29.95)
    })
  })

  describe('roundToCurrencyPrecision', () => {
    it('should return the rounded amount to the currency precision', () => {
      const amount = 29.955
      const currency = 'USD'
      const roundedAmount = roundToCurrencyPrecision(amount, currency)
      expect(roundedAmount).toBe(29.96)
    })
  })

  describe('PaymentDataManager', () => {
    it('should keep the source data intact', () => {
      const data = getData('REFERENCE')
      const dataManager = PaymentDataManager(data)
      dataManager.setData({ reference: 'NEW_REFERENCE' })

      const newData = dataManager.getData()
      expect(data.reference).toBe('REFERENCE')
      expect(newData.reference).toBe('NEW_REFERENCE')
    })

    it('should return false when isAuthorised is called with empty events array', () => {
      const data = getData('REFERENCE')
      const dataManager = PaymentDataManager(data)
      expect(dataManager.isAuthorised()).toBe(false)
    })

    it('should return true when isAuthorised is called with AUTHORISATION event SUCCEEDED', () => {
      const authorisation = getEvent(
        'authorisationProviderReference',
        'AUTHORISATION',
        'SUCCEEDED',
      )
      const data = getData('REFERENCE', [authorisation])
      const dataManager = PaymentDataManager(data)
      expect(dataManager.isAuthorised()).toBe(true)
    })

    it('should keep events idempotent after multiple updates', () => {
      const event = getEvent('captureProviderReference', 'CAPTURE', 'REQUESTED')
      const data = getData('REFERENCE', [event])

      const dataManager = PaymentDataManager(data)
      dataManager.setEvent(
        getEvent('captureProviderReference', 'CAPTURE', 'FAILED'),
      )
      dataManager.setEvent(
        getEvent('captureProviderReference', 'CAPTURE', 'REQUESTED'),
      )
      dataManager.setEvent(
        getEvent('captureProviderReference', 'CAPTURE', 'SUCCEEDED'),
      )
      dataManager.setEvent(
        getEvent('refundProviderReference', 'REFUND', 'REQUESTED'),
      )

      const updatedData = dataManager.getData()
      const updatedEvent = dataManager.getEvent('captureProviderReference')
      expect(updatedData.events?.length).toBe(2)
      expect(data.events?.length).toBe(1)
      expect(updatedEvent?.status).toBe('SUCCEEDED')
      expect(data.events?.[0].status).toBe('REQUESTED')
    })
  })
})

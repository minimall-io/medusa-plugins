import type { Types } from '@adyen/api-library'
import type {
  AccountHolderDTO,
  IPaymentModuleService,
  MedusaContainer,
  PaymentCollectionDTO,
  PaymentCustomerDTO,
  PaymentDTO,
  PaymentProviderContext,
  PaymentSessionDTO,
} from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { filter, find } from 'lodash'
import type { Event } from '../../src/utils/types'
import { getCardDetails, getCustomer, getProviderId } from './fixtures'
import { type IMockAdyenApi, mockAdyenApi } from './mocks'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

medusaIntegrationTestRunner({
  debug: false,
  testSuite: ({ getContainer }) => {
    describe('Adyen Payment Provider', () => {
      const recurringProcessingModel = 'CardOnFile'
      const shopperInteraction = 'Ecommerce'
      const storePaymentMethod = true
      let container: MedusaContainer
      let paymentService: IPaymentModuleService
      let collectionInput: { currency_code: string; amount: number }
      let provider_id: string
      let customer: PaymentCustomerDTO
      let encryptedCardDetails: Types.checkout.CardDetails
      let mock: IMockAdyenApi

      beforeAll(async () => {
        container = getContainer()
        paymentService = container.resolve(Modules.PAYMENT)
        collectionInput = { amount: 100.0, currency_code: 'usd' }
        provider_id = getProviderId()
        customer = getCustomer()
        encryptedCardDetails = getCardDetails()
        mock = mockAdyenApi()
      })

      beforeEach(() => {
        mock.reset()
      })

      describe('Test storing, retrieving, and deleting payment methods', () => {
        let accountHolder: AccountHolderDTO

        beforeEach(async () => {
          const input = { context: { customer }, provider_id }
          accountHolder = await paymentService.createAccountHolder(input)
          await delay(1000)
        })

        it('returns formatted shopper data properties when createAccountHolder is called', async () => {
          expect(accountHolder).toHaveProperty('id')
          expect(accountHolder).toHaveProperty('data')
          expect(accountHolder.data).toHaveProperty('shopperReference')
          expect(accountHolder.data).toHaveProperty('shopperEmail')
          expect(accountHolder.data).toHaveProperty('telephoneNumber')
          expect(accountHolder.data).toHaveProperty('shopperName')
          expect(accountHolder.data).toHaveProperty('company')
          expect(accountHolder.data).toHaveProperty('countryCode')
        })

        it('stores payment method for the customer when storePaymentMethod is called', async () => {
          const context = { account_holder: accountHolder }
          const data = { request: { paymentMethod: encryptedCardDetails } }
          const input = { context, data, provider_id }
          const paymentMethod = await paymentService.createPaymentMethods(input)

          expect(paymentMethod).toHaveProperty('id')
          expect(paymentMethod).toHaveProperty('data')
        })

        it('list stored payment methods for the customer when listPaymentMethods is called', async () => {
          const context = { account_holder: accountHolder }
          const data = { request: { paymentMethod: encryptedCardDetails } }
          const input = { context, data, provider_id }
          await paymentService.createPaymentMethods(input)

          const paymentMethods = await paymentService.listPaymentMethods({
            context,
            provider_id,
          })

          expect(paymentMethods).toHaveLength(1)
        })

        it('delete stored payment methods for the customer when deleteAccountHolder is called', async () => {
          const context = { account_holder: accountHolder }
          const data = { request: { paymentMethod: encryptedCardDetails } }
          const input = { context, data, provider_id }
          await paymentService.createPaymentMethods(input)
          await paymentService.deleteAccountHolder(accountHolder.id)

          const paymentMethods = await paymentService.listPaymentMethods({
            context,
            provider_id,
          })

          expect(paymentMethods).toHaveLength(0)
        })
      })

      describe('Test payment initialization method', () => {
        let collection: PaymentCollectionDTO
        let accountHolder: AccountHolderDTO

        beforeEach(async () => {
          const collections = await paymentService.createPaymentCollections([
            collectionInput,
          ])
          collection = collections[0]

          const input = { context: { customer }, provider_id }
          accountHolder = await paymentService.createAccountHolder(input)
          await delay(1000)
        })

        it('returns amount, shopper, and paymentMethods data properties when initiatePayment is called', async () => {
          const context = {
            account_holder: { data: accountHolder.data },
          } as PaymentProviderContext
          await paymentService.createPaymentSession(collection.id, {
            amount: collection.amount,
            context,
            currency_code: collection.currency_code,
            data: { request: {} },
            provider_id,
          })

          const [session] = await paymentService.listPaymentSessions({
            payment_collection_id: collection.id,
          })

          expect(session.data).toHaveProperty('amount')
          expect(session.data).toHaveProperty('shopper')
          expect(session.data).toHaveProperty('paymentMethodsResponse')
          expect(session.data).toHaveProperty('request')
        })

        it('returns amount and paymentMethods data properties when initiatePayment is called without account holder context', async () => {
          const context = {}
          await paymentService.createPaymentSession(collection.id, {
            amount: collection.amount,
            context,
            currency_code: collection.currency_code,
            data: { request: {} },
            provider_id,
          })

          const [session] = await paymentService.listPaymentSessions({
            payment_collection_id: collection.id,
          })

          expect(session.data).toHaveProperty('amount')
          expect(session.data).toHaveProperty('paymentMethodsResponse')
          expect(session.data).toHaveProperty('request')
        })
      })

      describe('Test payment update method', () => {
        let collection: PaymentCollectionDTO
        let session: PaymentSessionDTO

        beforeEach(async () => {
          const collections = await paymentService.createPaymentCollections([
            collectionInput,
          ])
          collection = collections[0]

          session = await paymentService.createPaymentSession(collection.id, {
            amount: collection.amount,
            currency_code: collection.currency_code,
            data: { request: {} },
            provider_id,
          })
          await delay(1000)
        })

        it('returns session amount data property when updatePaymentSession is called', async () => {
          const originalAmount = session.data!.amount as Types.checkout.Amount

          const alteredValue = Number(collection.amount) / 2
          const alteredAmount = {
            currency: collection.currency_code,
            value: alteredValue,
          }

          await paymentService.updatePaymentSession({
            amount: collection.amount,
            currency_code: collection.currency_code,
            data: { amount: alteredAmount, newProperty: 'newProperty' },
            id: session.id,
          })

          const [updatedSession] = await paymentService.listPaymentSessions({
            payment_collection_id: collection.id,
          })

          const updatedAmount = updatedSession.data!
            .amount as Types.checkout.Amount

          expect(updatedSession.data).toHaveProperty('amount')
          expect(updatedSession.data).toHaveProperty('newProperty')
          expect(updatedAmount.value).toEqual(originalAmount.value)
        })
      })

      describe('Test payment authorization method', () => {
        let collection: PaymentCollectionDTO
        let accountHolder: AccountHolderDTO
        let sessionWithAccountHolder: PaymentSessionDTO
        let sessionWithoutAccountHolder: PaymentSessionDTO

        beforeEach(async () => {
          const collections = await paymentService.createPaymentCollections([
            collectionInput,
          ])
          collection = collections[0]
          const input = { context: { customer }, provider_id }
          accountHolder = await paymentService.createAccountHolder(input)

          sessionWithoutAccountHolder =
            await paymentService.createPaymentSession(collection.id, {
              amount: collection.amount,
              currency_code: collection.currency_code,
              data: { request: {} },
              provider_id,
            })

          const context = {
            account_holder: { data: accountHolder.data },
          } as PaymentProviderContext
          sessionWithAccountHolder = await paymentService.createPaymentSession(
            collection.id,
            {
              amount: collection.amount,
              context,
              currency_code: collection.currency_code,
              data: { request: {} },
              provider_id,
            },
          )
          await delay(1000)
        })

        it('returns updated payment data property when authorizePayment is called using account holder context', async () => {
          await paymentService.updatePaymentSession({
            amount: collection.amount,
            currency_code: collection.currency_code,
            data: {
              request: {
                paymentMethod: encryptedCardDetails,
              },
            },
            id: sessionWithAccountHolder.id,
          })

          await paymentService.authorizePaymentSession(
            sessionWithAccountHolder.id,
            {},
          )

          const [payment] = await paymentService.listPayments({
            payment_session_id: sessionWithAccountHolder.id,
          })

          const { data } = payment
          const authorisations = filter(data?.events, {
            name: 'AUTHORISATION',
          })

          expect(data).toHaveProperty('reference')
          expect(data?.reference).toBe(sessionWithAccountHolder.id)
          expect(data).toHaveProperty('events')
          expect(data?.events).toHaveLength(1)
          expect(authorisations).toHaveLength(1)
          expect(data).not.toHaveProperty('request')
        })

        it('returns updated payment data property with saved payment method when authorizePayment is called with account holder context and storePaymentMethod is true', async () => {
          await paymentService.updatePaymentSession({
            amount: collection.amount,
            currency_code: collection.currency_code,
            data: {
              request: {
                paymentMethod: encryptedCardDetails,
                recurringProcessingModel,
                shopperInteraction,
                storePaymentMethod,
              },
            },
            id: sessionWithAccountHolder.id,
          })

          await paymentService.authorizePaymentSession(
            sessionWithAccountHolder.id,
            {},
          )

          const [payment] = await paymentService.listPayments({
            payment_session_id: sessionWithAccountHolder.id,
          })

          const { data } = payment
          const authorisations = filter(data?.events, {
            name: 'AUTHORISATION',
          })

          expect(data).toHaveProperty('reference')
          expect(data?.reference).toBe(sessionWithAccountHolder.id)
          expect(data).toHaveProperty('events')
          expect(data?.events).toHaveLength(1)
          expect(authorisations).toHaveLength(1)
          expect(data).not.toHaveProperty('request')
        })

        it('returns updated payment data property with saved payment method when authorizePayment is called with shopper data in the request and storePaymentMethod is true', async () => {
          await paymentService.updatePaymentSession({
            amount: collection.amount,
            currency_code: collection.currency_code,
            data: {
              request: {
                ...accountHolder.data,
                paymentMethod: encryptedCardDetails,
                recurringProcessingModel,
                shopperInteraction,
                storePaymentMethod,
              },
            },
            id: sessionWithoutAccountHolder.id,
          })

          await paymentService.authorizePaymentSession(
            sessionWithoutAccountHolder.id,
            {},
          )

          const [payment] = await paymentService.listPayments({
            payment_session_id: sessionWithoutAccountHolder.id,
          })

          const { data } = payment
          const authorisations = filter(data?.events, {
            name: 'AUTHORISATION',
          })

          expect(data).toHaveProperty('reference')
          expect(data?.reference).toBe(sessionWithoutAccountHolder.id)
          expect(data).toHaveProperty('events')
          expect(data?.events).toHaveLength(1)
          expect(authorisations).toHaveLength(1)
          expect(data).not.toHaveProperty('request')
        })

        it('returns updated payment data property with saved payment method when authorizePayment is called with account holder context preference and storePaymentMethod is true', async () => {
          await paymentService.updatePaymentSession({
            amount: collection.amount,
            currency_code: collection.currency_code,
            data: {
              request: {
                paymentMethod: encryptedCardDetails,
                recurringProcessingModel,
                shopperInteraction,
                shopperReference: 'random_shopper_reference',
                storePaymentMethod,
              },
            },
            id: sessionWithAccountHolder.id,
          })

          await paymentService.authorizePaymentSession(
            sessionWithAccountHolder.id,
            {},
          )

          const [payment] = await paymentService.listPayments({
            payment_session_id: sessionWithAccountHolder.id,
          })

          const { data } = payment
          const authorisations = filter(data?.events, {
            name: 'AUTHORISATION',
          })

          expect(data).toHaveProperty('reference')
          expect(data?.reference).toBe(sessionWithAccountHolder.id)
          expect(data).toHaveProperty('events')
          expect(data?.events).toHaveLength(1)
          expect(authorisations).toHaveLength(1)
          expect(data).not.toHaveProperty('request')
        })

        it('returns updated payment data property when authorizePayment is called', async () => {
          await paymentService.updatePaymentSession({
            amount: collection.amount,
            currency_code: collection.currency_code,
            data: {
              request: {
                paymentMethod: encryptedCardDetails,
              },
            },
            id: sessionWithoutAccountHolder.id,
          })

          await paymentService.authorizePaymentSession(
            sessionWithoutAccountHolder.id,
            {},
          )

          const [payment] = await paymentService.listPayments({
            payment_session_id: sessionWithoutAccountHolder.id,
          })

          const { data } = payment
          const authorisations = filter(data?.events, {
            name: 'AUTHORISATION',
          })

          expect(data).toHaveProperty('reference')
          expect(data?.reference).toBe(sessionWithoutAccountHolder.id)
          expect(data).toHaveProperty('events')
          expect(data?.events).toHaveLength(1)
          expect(authorisations).toHaveLength(1)
          expect(data).not.toHaveProperty('request')
        })
      })

      describe('Test payment modification methods', () => {
        let collection: PaymentCollectionDTO
        let session: PaymentSessionDTO
        let payment: PaymentDTO

        beforeEach(async () => {
          const collections = await paymentService.createPaymentCollections([
            collectionInput,
          ])
          collection = collections[0]

          session = await paymentService.createPaymentSession(collection.id, {
            amount: collection.amount,
            context: {},
            currency_code: collection.currency_code,
            data: { request: {} },
            provider_id,
          })

          await paymentService.updatePaymentSession({
            amount: collection.amount,
            currency_code: collection.currency_code,
            data: {
              request: {
                paymentMethod: encryptedCardDetails,
                recurringProcessingModel,
                shopperInteraction,
                storePaymentMethod,
              },
            },
            id: session.id,
          })

          payment = await paymentService.authorizePaymentSession(session.id, {})
          const originalAuthorization = find(payment.data?.events, {
            name: 'AUTHORISATION',
          })
          const newAuthorization = {
            ...originalAuthorization,
            status: 'SUCCEEDED',
          }
          const otherEvents = filter(
            payment.data?.events,
            (event: Event) => event.name !== 'AUTHORISATION',
          )
          const events = [...otherEvents, newAuthorization]

          const data = { ...payment.data, events }
          const paymentToUpdate = {
            data,
            id: payment.id,
          }
          await paymentService.updatePayment(paymentToUpdate)
          await delay(1000)
        })

        it('cancels the non-authorized payment when cancelPayment is called', async () => {
          /**
           * As of this writing, the payment module's cancelPayment method,
           * doesn't preserve the provider's cancelPayment method's return value.
           * Therefore, we can only validate payment cancellation by checking the payment's canceled_at property.
           */
          await paymentService.cancelPayment(payment.id)

          const newPayment = await paymentService.retrievePayment(payment.id)
          const authorisations = filter(newPayment.data?.events, {
            name: 'AUTHORISATION',
          })

          expect(newPayment.canceled_at).not.toBeNull()
          expect(newPayment.data).toHaveProperty('amount')
          expect(newPayment.data).toHaveProperty('events')
          expect(newPayment.data?.events).toHaveLength(1)
          expect(authorisations).toHaveLength(1)
          expect(newPayment.data).toHaveProperty('reference')
          expect(newPayment.data).not.toHaveProperty('request')
        })

        it('returns updated payment data property when capturePayment is called', async () => {
          /**
           * As of this writing, the payment module's capturePayment method,
           * although it accepts the amount parameter,
           * doesn't pass it to the provider's capturePayment method.
           * Therefore, all we can do is capture the full amount in the provider's capturePayment method.
           */
          await paymentService.capturePayment({ payment_id: payment.id })

          const newPayment = await paymentService.retrievePayment(payment.id)

          const authorisations = filter(newPayment.data?.events, {
            name: 'AUTHORISATION',
          })
          const captures = filter(newPayment.data?.events, { name: 'CAPTURE' })

          expect(newPayment.data).toHaveProperty('amount')
          expect(newPayment.data).toHaveProperty('events')
          expect(newPayment.data?.events).toHaveLength(2)
          expect(authorisations).toHaveLength(1)
          expect(captures).toHaveLength(1)
          expect(newPayment.data).toHaveProperty('reference')
          expect(newPayment.data).not.toHaveProperty('request')
        })

        it('returns updated payment data property when refundPayment is called', async () => {
          await paymentService.capturePayment({ payment_id: payment.id })

          const ten = 10.0
          const remainingAmount = 90.0

          /**
           * As of this writing, the payment module's refundPayment method,
           * is missing automatic refund of the remaining amount (without amount parameter).
           * Without the amount parameter, the provider's refundPayment method
           * will try to refund the full amount, which will fail in cases where previous refunds were issued
           * and therefore decreased the amount available for refund.
           * Therefore, we need to refund the remaining amount manually.
           */
          await paymentService.refundPayment({
            amount: ten,
            payment_id: payment.id,
          })

          await paymentService.refundPayment({
            amount: remainingAmount,
            payment_id: payment.id,
          })

          const newPayment = await paymentService.retrievePayment(payment.id)

          const authorisations = filter(newPayment.data?.events, {
            name: 'AUTHORISATION',
          })
          const captures = filter(newPayment.data?.events, { name: 'CAPTURE' })
          const refunds = filter(newPayment.data?.events, { name: 'REFUND' })

          expect(newPayment.data).toHaveProperty('amount')
          expect(newPayment.data).toHaveProperty('events')
          expect(newPayment.data?.events).toHaveLength(4)
          expect(authorisations).toHaveLength(1)
          expect(captures).toHaveLength(1)
          expect(refunds).toHaveLength(2)
          expect(newPayment.data).toHaveProperty('reference')
          expect(newPayment.data).not.toHaveProperty('request')
        })
      })
    })
  },
})

jest.setTimeout(60 * 1000)

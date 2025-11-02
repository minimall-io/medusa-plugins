import { Types } from '@adyen/api-library'
import {
  PaymentCollectionDTO,
  PaymentCustomerDTO,
  PaymentProviderContext,
} from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import {
  getAmount,
  getCardDetails,
  getCurrencyCode,
  getCustomer,
  getProviderId,
} from '../mocks'

medusaIntegrationTestRunner({
  debug: false,
  testSuite: ({ getContainer }) => {
    let collectionInput: { currency_code: string; amount: number }
    let provider_id: string
    let customer: PaymentCustomerDTO
    let paymentMethod: Types.checkout.CardDetails

    beforeAll(async () => {
      const currency_code = getCurrencyCode()
      const amount = getAmount()
      collectionInput = { currency_code, amount }
      provider_id = getProviderId()
      customer = getCustomer()
      paymentMethod = getCardDetails()
    })

    describe('Test adyen payment provider core methods.', () => {
      let collection: PaymentCollectionDTO

      beforeEach(async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const collections = await paymentService.createPaymentCollections([
          collectionInput,
        ])
        collection = collections[0]
      })

      it('returns formatted shopper data properties when createAccountHolder is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const context = { customer }
        const input = { context, provider_id }
        const accountHolder = await paymentService.createAccountHolder(input)

        console.log(
          'createAccountHolder/accountHolder',
          JSON.stringify(accountHolder, null, 2),
        )
        expect(accountHolder).toHaveProperty('id')
        expect(accountHolder).toHaveProperty('data')
        expect(accountHolder.data).toHaveProperty('shopperReference')
        expect(accountHolder.data).toHaveProperty('shopperEmail')
        expect(accountHolder.data).toHaveProperty('telephoneNumber')
        expect(accountHolder.data).toHaveProperty('shopperName')
        expect(accountHolder.data).toHaveProperty('company')
        expect(accountHolder.data).toHaveProperty('countryCode')
      })

      it('returns amount, shopper, and paymentMethods data properties when initiatePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const accountHolderContext = { customer }
        const input = { context: accountHolderContext, provider_id }
        const accountHolder = await paymentService.createAccountHolder(input)

        const paymentContext = {
          account_holder: { data: accountHolder.data },
        } as PaymentProviderContext
        await paymentService.createPaymentSession(collection.id, {
          provider_id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          context: paymentContext,
          data: { request: {} },
        })

        const [session] = await paymentService.listPaymentSessions({
          payment_collection_id: collection.id,
        })

        console.log(
          'createPaymentSession/session',
          JSON.stringify(session, null, 2),
        )
        expect(session.data).toHaveProperty('amount')
        expect(session.data).toHaveProperty('shopper')
        expect(session.data).toHaveProperty('paymentMethods')
        expect(session.data).not.toHaveProperty('request')
      })

      it('returns session amount data property when updatePaymentSession is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const session = await paymentService.createPaymentSession(
          collection.id,
          {
            provider_id,
            currency_code: collection.currency_code,
            amount: collection.amount,
            context: {},
            data: { request: {} },
          },
        )

        const alteredValue = Number(collection.amount) / 2
        const alteredAmount = {
          value: alteredValue,
          currency: collection.currency_code,
        }

        await paymentService.updatePaymentSession({
          id: session.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: { amount: alteredAmount, newProperty: 'newProperty' },
        })

        const [updatedSession] = await paymentService.listPaymentSessions({
          payment_collection_id: collection.id,
        })

        console.log(
          'updatePaymentSession/updatedSession',
          JSON.stringify(updatedSession, null, 2),
        )

        const originalAmount = session.data!.amount as Types.checkout.Amount
        const updatedAmount = updatedSession.data!
          .amount as Types.checkout.Amount

        expect(updatedSession.data).toHaveProperty('amount')
        expect(updatedSession.data).toHaveProperty('newProperty')
        expect(updatedAmount.value).toEqual(originalAmount.value)
      })

      it('returns authorization data property when authorizePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const accountHolderContext = { customer }
        const input = { context: accountHolderContext, provider_id }
        const accountHolder = await paymentService.createAccountHolder(input)

        const paymentContext = {
          account_holder: { data: accountHolder.data },
        } as PaymentProviderContext
        const session = await paymentService.createPaymentSession(
          collection.id,
          {
            provider_id,
            currency_code: collection.currency_code,
            amount: collection.amount,
            context: paymentContext,
            data: { request: {} },
          },
        )

        await paymentService.updatePaymentSession({
          id: session.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: { paymentMethod: paymentMethod, storePaymentMethod: true },
          },
        })

        await paymentService.authorizePaymentSession(session.id, {})

        const [payment] = await paymentService.listPayments({
          payment_session_id: session.id,
        })

        console.log(
          'authorizePaymentSession/payment',
          JSON.stringify(payment, null, 2),
        )
        expect(payment.data).toHaveProperty('authorization')
        expect(payment.data).not.toHaveProperty('request')
      })

      it('cancels the non-authorized payment when cancelPayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const session = await paymentService.createPaymentSession(
          collection.id,
          {
            provider_id,
            currency_code: collection.currency_code,
            amount: collection.amount,
            context: {},
            data: { request: {} },
          },
        )

        await paymentService.updatePaymentSession({
          id: session.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: { paymentMethod: paymentMethod, storePaymentMethod: true },
          },
        })

        const payment = await paymentService.authorizePaymentSession(
          session.id,
          {},
        )

        /**
         * As of this writing, the payment module's cancelPayment method,
         * doesn't preserve the provider's cancelPayment method's return value.
         * Therefore, we can only validate payment cancellation by checking the payment's canceled_at property.
         */
        await paymentService.cancelPayment(payment.id)

        const [cancelledPayment] = await paymentService.listPayments({
          payment_session_id: session.id,
        })

        console.log(
          'cancelPayment/cancelledPayment',
          JSON.stringify(cancelledPayment, null, 2),
        )
        expect(cancelledPayment.canceled_at).not.toBeNull()
      })

      it('returns captures data property when capturePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const session = await paymentService.createPaymentSession(
          collection.id,
          {
            provider_id,
            currency_code: collection.currency_code,
            amount: collection.amount,
            context: {},
            data: { request: {} },
          },
        )

        await paymentService.updatePaymentSession({
          id: session.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: { paymentMethod: paymentMethod },
          },
        })

        const payment = await paymentService.authorizePaymentSession(
          session.id,
          {},
        )

        /**
         * As of this writing, the payment module's capturePayment method,
         * although it accepts the amount parameter,
         * doesn't pass it to the provider's capturePayment method.
         * Therefore, all we can do is capture the full amount in the provider's capturePayment method.
         */
        await paymentService.capturePayment({ payment_id: payment.id })

        const [capturedPayment] = await paymentService.listPayments({
          payment_session_id: session.id,
        })

        console.log(
          'capturePayment/capturedPayment',
          JSON.stringify(capturedPayment, null, 2),
        )
        expect(capturedPayment.data).toHaveProperty('authorization')
        expect(capturedPayment.data).toHaveProperty('captures')
        expect(capturedPayment.data).not.toHaveProperty('request')
      })
    })
  },
})

jest.setTimeout(60 * 1000)

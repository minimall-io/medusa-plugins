import { Types } from '@adyen/api-library'
import {
  AccountHolderDTO,
  PaymentCollectionDTO,
  PaymentCustomerDTO,
  PaymentDTO,
  PaymentProviderContext,
  PaymentSessionDTO,
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
    let cardDetails: Types.checkout.CardDetails

    beforeAll(async () => {
      const currency_code = getCurrencyCode()
      const amount = getAmount()
      collectionInput = { currency_code, amount }
      provider_id = getProviderId()
      customer = getCustomer()
      paymentMethod = getCardDetails()
      cardDetails = getCardDetails()
    })

    describe('Test storing, retrieving, and deleting payment methods', () => {
      let accountHolder: AccountHolderDTO

      beforeEach(async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const input = { context: { customer }, provider_id }
        accountHolder = await paymentService.createAccountHolder(input)
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
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const context = { account_holder: accountHolder }
        const data = { request: { paymentMethod: cardDetails } }
        const input = { context, data, provider_id }
        const paymentMethod = await paymentService.createPaymentMethods(input)

        console.log(
          'createPaymentMethods/paymentMethod',
          JSON.stringify(paymentMethod, null, 2),
        )
        expect(paymentMethod).toHaveProperty('id')
        expect(paymentMethod).toHaveProperty('data')
      })

      it('list stored payment methods for the customer when listPaymentMethods is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const context = { account_holder: accountHolder }
        const data = { request: { paymentMethod: cardDetails } }
        const input = { context, data, provider_id }
        await paymentService.createPaymentMethods(input)

        const paymentMethods = await paymentService.listPaymentMethods({
          context,
          provider_id,
        })

        console.log(
          'listPaymentMethods/paymentMethods',
          JSON.stringify(paymentMethods, null, 2),
        )
        expect(paymentMethods).toHaveLength(1)
      })

      it('delete stored payment methods for the customer when deleteAccountHolder is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const context = { account_holder: accountHolder }
        const data = { request: { paymentMethod: cardDetails } }
        const input = { context, data, provider_id }
        await paymentService.createPaymentMethods(input)
        await paymentService.deleteAccountHolder(accountHolder.id)

        const paymentMethods = await paymentService.listPaymentMethods({
          context,
          provider_id,
        })

        console.log(
          'listPaymentMethods/paymentMethods',
          JSON.stringify(paymentMethods, null, 2),
        )
        expect(paymentMethods).toHaveLength(0)
      })
    })

    describe('Test payment initialization', () => {
      let collection: PaymentCollectionDTO
      let accountHolder: AccountHolderDTO

      beforeEach(async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const collections = await paymentService.createPaymentCollections([
          collectionInput,
        ])
        collection = collections[0]

        const input = { context: { customer }, provider_id }
        accountHolder = await paymentService.createAccountHolder(input)
      })

      it('returns amount, shopper, and paymentMethods data properties when initiatePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const context = {
          account_holder: { data: accountHolder.data },
        } as PaymentProviderContext
        await paymentService.createPaymentSession(collection.id, {
          provider_id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          context,
          data: { request: {} },
        })

        const [session] = await paymentService.listPaymentSessions({
          payment_collection_id: collection.id,
        })

        expect(session.data).toHaveProperty('amount')
        expect(session.data).toHaveProperty('shopper')
        expect(session.data).toHaveProperty('paymentMethods')
        expect(session.data).not.toHaveProperty('request')
      })

      it('returns amount and paymentMethods data properties when initiatePayment is called without account holder context', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const context = {}
        await paymentService.createPaymentSession(collection.id, {
          provider_id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          context,
          data: { request: {} },
        })

        const [session] = await paymentService.listPaymentSessions({
          payment_collection_id: collection.id,
        })

        expect(session.data).toHaveProperty('amount')
        expect(session.data).toHaveProperty('paymentMethods')
        expect(session.data).not.toHaveProperty('request')
      })
    })

    describe('Test payment updates', () => {
      let collection: PaymentCollectionDTO
      let session: PaymentSessionDTO

      beforeEach(async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const collections = await paymentService.createPaymentCollections([
          collectionInput,
        ])
        collection = collections[0]

        session = await paymentService.createPaymentSession(collection.id, {
          provider_id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: { request: {} },
        })
      })

      it('returns session amount data property when updatePaymentSession is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const originalAmount = session.data!.amount as Types.checkout.Amount

        // trying to update the amount to half of the original amount
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

        const updatedAmount = updatedSession.data!
          .amount as Types.checkout.Amount

        expect(updatedSession.data).toHaveProperty('amount')
        expect(updatedSession.data).toHaveProperty('newProperty')
        expect(updatedAmount.value).toEqual(originalAmount.value)
      })
    })

    describe('Test payment authorizations', () => {
      let collection: PaymentCollectionDTO
      let accountHolder: AccountHolderDTO
      let sessionWithAccountHolder: PaymentSessionDTO
      let sessionWithoutAccountHolder: PaymentSessionDTO

      beforeEach(async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const collections = await paymentService.createPaymentCollections([
          collectionInput,
        ])
        collection = collections[0]
        const input = { context: { customer }, provider_id }
        accountHolder = await paymentService.createAccountHolder(input)

        sessionWithoutAccountHolder = await paymentService.createPaymentSession(
          collection.id,
          {
            provider_id,
            currency_code: collection.currency_code,
            amount: collection.amount,
            data: { request: {} },
          },
        )

        const context = {
          account_holder: { data: accountHolder.data },
        } as PaymentProviderContext
        sessionWithAccountHolder = await paymentService.createPaymentSession(
          collection.id,
          {
            provider_id,
            currency_code: collection.currency_code,
            amount: collection.amount,
            context,
            data: { request: {} },
          },
        )
      })

      it('returns authorization data property when authorizePayment is called using account holder context', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        await paymentService.updatePaymentSession({
          id: sessionWithAccountHolder.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: {
              paymentMethod: paymentMethod,
            },
          },
        })

        await paymentService.authorizePaymentSession(
          sessionWithAccountHolder.id,
          {},
        )

        const [payment] = await paymentService.listPayments({
          payment_session_id: sessionWithAccountHolder.id,
        })

        const { data } = payment

        expect(data).toHaveProperty('authorization')
        expect(data).not.toHaveProperty('request')
      })

      it('returns authorization data property with saved payment method when authorizePayment is called with account holder context and storePaymentMethod is true', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        await paymentService.updatePaymentSession({
          id: sessionWithAccountHolder.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: { paymentMethod: paymentMethod, storePaymentMethod: true },
          },
        })

        await paymentService.authorizePaymentSession(
          sessionWithAccountHolder.id,
          {},
        )

        const [payment] = await paymentService.listPayments({
          payment_session_id: sessionWithAccountHolder.id,
        })

        const { data } = payment
        const authorization = data!
          .authorization as Types.checkout.PaymentResponse

        expect(data).toHaveProperty('authorization')
        expect(authorization).toHaveProperty('additionalData')
        expect(
          authorization.additionalData!['tokenization.shopperReference'],
        ).toEqual(accountHolder.data!.shopperReference)
        expect(data).not.toHaveProperty('request')
      })

      it('returns authorization data property with saved payment method when authorizePayment is called with shopper data in the request and storePaymentMethod is true', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        await paymentService.updatePaymentSession({
          id: sessionWithoutAccountHolder.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: {
              ...accountHolder.data,
              paymentMethod: paymentMethod,
              storePaymentMethod: true,
            },
          },
        })

        await paymentService.authorizePaymentSession(
          sessionWithoutAccountHolder.id,
          {},
        )

        const [payment] = await paymentService.listPayments({
          payment_session_id: sessionWithoutAccountHolder.id,
        })

        const { data } = payment
        const authorization = data!
          .authorization as Types.checkout.PaymentResponse

        expect(data).toHaveProperty('authorization')
        expect(authorization).toHaveProperty('additionalData')
        expect(
          authorization.additionalData!['tokenization.shopperReference'],
        ).toEqual(accountHolder.data!.shopperReference)
        expect(data).not.toHaveProperty('request')
      })

      it('returns authorization data property with saved payment method when authorizePayment is called with account holder context preference and storePaymentMethod is true', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        await paymentService.updatePaymentSession({
          id: sessionWithAccountHolder.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: {
              shopperReference: 'random_shopper_reference',
              paymentMethod: paymentMethod,
              storePaymentMethod: true,
            },
          },
        })

        await paymentService.authorizePaymentSession(
          sessionWithAccountHolder.id,
          {},
        )

        const [payment] = await paymentService.listPayments({
          payment_session_id: sessionWithAccountHolder.id,
        })

        const { data } = payment
        const authorization = data!
          .authorization as Types.checkout.PaymentResponse

        expect(data).toHaveProperty('authorization')
        expect(authorization).toHaveProperty('additionalData')
        expect(
          authorization.additionalData!['tokenization.shopperReference'],
        ).toEqual(accountHolder.data!.shopperReference)
        expect(data).not.toHaveProperty('request')
      })

      it('returns authorization data property when authorizePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        await paymentService.updatePaymentSession({
          id: sessionWithoutAccountHolder.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: {
              paymentMethod: paymentMethod,
            },
          },
        })

        await paymentService.authorizePaymentSession(
          sessionWithoutAccountHolder.id,
          {},
        )

        const [payment] = await paymentService.listPayments({
          payment_session_id: sessionWithoutAccountHolder.id,
        })

        const { data } = payment

        expect(data).toHaveProperty('authorization')
        expect(data).not.toHaveProperty('request')
      })
    })

    describe('Test payment modification methods', () => {
      let collection: PaymentCollectionDTO
      let session: PaymentSessionDTO
      let payment: PaymentDTO

      beforeEach(async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const collections = await paymentService.createPaymentCollections([
          collectionInput,
        ])
        collection = collections[0]

        session = await paymentService.createPaymentSession(collection.id, {
          provider_id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          context: {},
          data: { request: {} },
        })

        await paymentService.updatePaymentSession({
          id: session.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: { paymentMethod: paymentMethod, storePaymentMethod: true },
          },
        })

        payment = await paymentService.authorizePaymentSession(session.id, {})
      })

      it('cancels the non-authorized payment when cancelPayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        /**
         * As of this writing, the payment module's cancelPayment method,
         * doesn't preserve the provider's cancelPayment method's return value.
         * Therefore, we can only validate payment cancellation by checking the payment's canceled_at property.
         */
        await paymentService.cancelPayment(payment.id)

        const [cancelledPayment] = await paymentService.listPayments({
          payment_session_id: session.id,
        })

        expect(cancelledPayment.canceled_at).not.toBeNull()
      })

      it('returns captures data property when capturePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

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

        expect(capturedPayment.data).toHaveProperty('authorization')
        expect(capturedPayment.data).toHaveProperty('captures')
        expect(capturedPayment.data).not.toHaveProperty('request')
      })

      it('returns refunds data property when refundPayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        await paymentService.capturePayment({ payment_id: payment.id })

        const totalAmount = Number(collection.amount)
        const ten = 10
        const remainingAmount = totalAmount - ten

        /**
         * As of this writing, the payment module's refundPayment method,
         * is missing automatic refund of the remaining amount (without amount parameter).
         * Without the amount parameter, the provider's refundPayment method
         * will try to refund the full amount, which will fail in cases where previous refunds were issued
         * and therefore decreased the amount available for refund.
         * Therefore, we need to refund the remaining amount manually.
         */
        await paymentService.refundPayment({
          payment_id: payment.id,
          amount: ten,
        })

        await paymentService.refundPayment({
          payment_id: payment.id,
          amount: remainingAmount,
        })

        const [refundedPayment] = await paymentService.listPayments({
          payment_session_id: session.id,
        })

        expect(refundedPayment.data).toHaveProperty('authorization')
        expect(refundedPayment.data).toHaveProperty('refunds')
        expect(refundedPayment.data).not.toHaveProperty('request')
      })
    })
  },
})

jest.setTimeout(120 * 1000)

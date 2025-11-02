import { Types } from '@adyen/api-library'
import {
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

      it('returns amount, shopper, paymentMethods data properties when initiatePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const [collection] = await paymentService.createPaymentCollections([
          collectionInput,
        ])

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

        console.log(
          'createPaymentSession/session',
          JSON.stringify(session, null, 2),
        )
        expect(session.data).toHaveProperty('amount')
        expect(session.data).toHaveProperty('shopper')
        expect(session.data).toHaveProperty('paymentMethods')
      })

      it('returns authorization data property when authorizePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const [collection] = await paymentService.createPaymentCollections([
          collectionInput,
        ])

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

        const payment = await paymentService.authorizePaymentSession(
          session.id,
          {},
        )

        console.log(
          'authorizePaymentSession/payment',
          JSON.stringify(payment, null, 2),
        )
        expect(payment.data).toHaveProperty('authorization')
      })
    })
  },
})

jest.setTimeout(60 * 1000)

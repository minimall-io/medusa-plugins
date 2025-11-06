import { Types } from '@adyen/api-library'
import {
  PaymentCustomerDTO,
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
} from './fixtures'

medusaIntegrationTestRunner({
  debug: false,
  testSuite: ({ getContainer }) => {
    let collectionInput: { currency_code: string; amount: number }
    let provider_id: string
    let customer: PaymentCustomerDTO
    let encryptedCardDetails: Types.checkout.CardDetails
    let unencryptedCardDetails: Types.checkout.CardDetails

    beforeAll(async () => {
      const currency_code = getCurrencyCode()
      const amount = getAmount()
      collectionInput = { currency_code, amount }
      provider_id = getProviderId()
      customer = getCustomer()
      encryptedCardDetails = getCardDetails()
      unencryptedCardDetails = getCardDetails(false)
    })

    xdescribe('Test capture notification workflow', () => {
      let session: PaymentSessionDTO

      beforeEach(async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const collections = await paymentService.createPaymentCollections([
          collectionInput,
        ])
        const collection = collections[0]

        const newSession = await paymentService.createPaymentSession(
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
          id: newSession.id,
          currency_code: collection.currency_code,
          amount: collection.amount,
          data: {
            request: {
              paymentMethod: encryptedCardDetails,
              storePaymentMethod: true,
            },
          },
        })

        const [updatedSession] = await paymentService.listPaymentSessions({
          id: newSession.id,
        })
        session = updatedSession
      })

      it('cancels the non-authorized payment when cancelPayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

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

        expect(cancelledPayment.canceled_at).not.toBeNull()
      })

      it('returns captures data property when capturePayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

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

        expect(capturedPayment.data).toHaveProperty('authorization')
        expect(capturedPayment.data).toHaveProperty('captures')
        expect(capturedPayment.data).not.toHaveProperty('request')
      })

      it('returns refunds data property when refundPayment is called', async () => {
        const container = getContainer()
        const paymentService = container.resolve(Modules.PAYMENT)

        const payment = await paymentService.authorizePaymentSession(
          session.id,
          {},
        )

        await paymentService.capturePayment({ payment_id: payment.id })

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

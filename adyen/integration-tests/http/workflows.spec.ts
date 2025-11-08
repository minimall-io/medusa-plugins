import { Types } from '@adyen/api-library'
import {
  IPaymentModuleService,
  MedusaContainer,
  PaymentCustomerDTO,
  PaymentDTO,
} from '@medusajs/framework/types'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { processNotificationWorkflow } from '../../src/workflows'
import {
  getAmount,
  getCardDetails,
  getCurrencyCode,
  getCustomer,
  getNotificationRequestItem,
  getProviderId,
} from './fixtures'

interface PaymentModification {
  pspReference: string
  status: string
  reference: string
  amount: {
    currency: string
    value: number
  }
}

const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

medusaIntegrationTestRunner({
  debug: false,
  testSuite: ({ getContainer }) => {
    describe('Adyen Webhook(s) Processing Workflow', () => {
      let container: MedusaContainer
      let paymentService: IPaymentModuleService
      let collectionInput: { currency_code: string; amount: number }
      let provider_id: string
      let customer: PaymentCustomerDTO
      let encryptedCardDetails: Types.checkout.CardDetails

      beforeAll(async () => {
        container = getContainer()
        paymentService = container.resolve(Modules.PAYMENT)
        const currency_code = getCurrencyCode()
        const amount = getAmount()
        collectionInput = { currency_code, amount }
        provider_id = getProviderId()
        customer = getCustomer()
        encryptedCardDetails = getCardDetails()
      })

      describe('Test capture notification processing', () => {
        let payment: PaymentDTO

        beforeEach(async () => {
          const collections = await paymentService.createPaymentCollections([
            collectionInput,
          ])
          const collection = collections[0]

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
              request: {
                paymentMethod: encryptedCardDetails,
              },
            },
          })

          await paymentService.authorizePaymentSession(session.id, {})

          const [authorizedPayment] = await paymentService.listPayments(
            {
              payment_session_id: session.id,
            },
            {
              relations: ['payment_session', 'captures'],
            },
          )

          payment = authorizedPayment
          await delay(1000)
        })

        it('adds a payment capture in the captures data property with success status after a success capture webhook is processed', async () => {
          const pspReference = 'pspReference'
          const reference = payment.payment_session!.id
          const amount = payment.amount as number
          const currency = payment.currency_code.toUpperCase()

          const notification = getNotificationRequestItem(
            pspReference,
            reference,
            amount,
            currency,
            EventCodeEnum.Capture,
            SuccessEnum.True,
          )

          const workflow = processNotificationWorkflow(container)
          await workflow.run({
            input: notification,
          })

          const [updatedPayment] = await paymentService.listPayments({
            id: payment.id,
          })
          const updatedCaptures = updatedPayment.data!
            .captures as PaymentModification[]
          const lastUpdatedCapture = updatedCaptures[0]

          expect(lastUpdatedCapture.pspReference).toBe(pspReference)
          expect(lastUpdatedCapture.reference).toBe(reference)
          expect(lastUpdatedCapture.amount.value).toBe(amount)
          expect(lastUpdatedCapture.amount.currency).toBe(currency)
          expect(lastUpdatedCapture.status).toBe('success')
        })

        it('updates a payment capture in the captures data property with success status after a success capture webhook is processed', async () => {
          await paymentService.capturePayment({ payment_id: payment.id })

          const [originalPayment] = await paymentService.listPayments({
            id: payment.id,
          })

          const originalCaptures = originalPayment.data!
            .captures as PaymentModification[]
          const originalCapture = originalCaptures[0]

          const notification = getNotificationRequestItem(
            originalCapture.pspReference,
            originalCapture.reference,
            originalCapture.amount.value,
            originalCapture.amount.currency,
            EventCodeEnum.Capture,
            SuccessEnum.True,
          )
          const workflow = processNotificationWorkflow(container)
          await workflow.run({
            input: notification,
          })

          const [updatedPayment] = await paymentService.listPayments({
            id: payment.id,
          })
          const updatedCaptures = updatedPayment.data!
            .captures as PaymentModification[]
          const updatedCapture = updatedCaptures[0]

          expect(originalCaptures.length).toBe(1)
          expect(updatedCaptures.length).toBe(1)
          expect(originalCapture.status).toBe('received')
          expect(updatedCapture.status).toBe('success')
        })
      })

      describe('Test capture notification processing failures', () => {
        beforeAll(() => {
          processNotificationWorkflow.hooks.validateNotification(() => {
            throw new MedusaError(
              MedusaError.Types.NOT_ALLOWED,
              'processNotificationWorkflow/hooks/validateNotification/error',
            )
          })
          processNotificationWorkflow.hooks.notificationProcessed(() => {
            throw new MedusaError(
              MedusaError.Types.NOT_ALLOWED,
              'processNotificationWorkflow/hooks/notificationProcessed/error',
            )
          })
        })

        describe('failures', () => {
          let payment: PaymentDTO

          beforeEach(async () => {
            const collections = await paymentService.createPaymentCollections([
              collectionInput,
            ])
            const collection = collections[0]

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
                request: {
                  paymentMethod: encryptedCardDetails,
                },
              },
            })

            await paymentService.authorizePaymentSession(session.id, {})

            const [authorizedPayment] = await paymentService.listPayments(
              {
                payment_session_id: session.id,
              },
              {
                relations: ['payment_session', 'captures'],
              },
            )

            payment = authorizedPayment
            await delay(1000)
          })

          fit('restore initial payment state after a success capture webhook processing fails', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const [originalPayment] = await paymentService.listPayments(
              {
                id: payment.id,
              },
              {
                relations: ['captures'],
              },
            )

            const originalCaptures = originalPayment.data!
              .captures as PaymentModification[]
            const originalCapture = originalCaptures[0]

            const notification = getNotificationRequestItem(
              originalCapture.pspReference,
              originalCapture.reference,
              originalCapture.amount.value,
              originalCapture.amount.currency,
              EventCodeEnum.Capture,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)

            const { errors, result } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [updatedPayment] = await paymentService.listPayments(
              {
                id: payment.id,
              },
              {
                relations: ['captures'],
              },
            )
            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]
            const updatedCapture = updatedCaptures[0]

            console.log(
              'processNotificationWorkflow/errors',
              JSON.stringify(errors, null, 2),
            )
            console.log(
              'processNotificationWorkflow/result',
              JSON.stringify(result, null, 2),
            )
            console.log(
              'processNotificationWorkflow/originalPayment',
              JSON.stringify(originalPayment, null, 2),
            )
            console.log(
              'processNotificationWorkflow/updatedPayment',
              JSON.stringify(updatedPayment, null, 2),
            )

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                handlerType: 'invoke',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
              },
            ])
            expect(originalPayment.captures!.length).toBe(1)
            expect(updatedPayment.captures!.length).toBe(1)
            expect(originalCaptures.length).toBe(1)
            expect(updatedCaptures.length).toBe(1)
            expect(originalCapture.status).toBe('received')
            expect(updatedCapture.status).toBe('received')
          })
        })
      })
    })
  },
})

jest.setTimeout(120 * 1000)

import { Types } from '@adyen/api-library'
import type {
  IPaymentModuleService,
  MedusaContainer,
  PaymentSessionDTO,
} from '@medusajs/framework/types'
import {
  MedusaError,
  Modules,
  PaymentCollectionStatus,
  PaymentSessionStatus,
} from '@medusajs/framework/utils'
import { WorkflowManager } from '@medusajs/orchestration'
import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { OrchestrationUtils } from '@medusajs/utils'
import { filter, find } from 'lodash'
import type { Event } from '../../src/utils/types'
import { processNotificationWorkflow } from '../../src/workflows'
import {
  getCardDetails,
  getNotificationRequestItem,
  getProviderId,
} from './fixtures'

type NotificationRequestItem = Types.notification.NotificationRequestItem
const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

medusaIntegrationTestRunner({
  debug: false,
  testSuite: ({ getContainer }) => {
    describe('Adyen Webhook Notification Processing Workflow', () => {
      let container: MedusaContainer
      let paymentService: IPaymentModuleService
      let collectionInput: { currency_code: string; amount: number }
      let amount: number
      let currency: string
      let provider_id: string
      let reference: string
      let encryptedCardDetails: Types.checkout.CardDetails
      let session: PaymentSessionDTO

      const authorizePaymentSession = async (sessionId: string) => {
        const payment = await paymentService.authorizePaymentSession(
          sessionId,
          {},
        )
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

        return await paymentService.retrievePayment(payment.id)
      }

      beforeAll(async () => {
        container = getContainer()
        paymentService = container.resolve(Modules.PAYMENT)
        collectionInput = { amount: 100.0, currency_code: 'usd' }
        amount = 10000
        currency = 'USD'
        provider_id = getProviderId()
        encryptedCardDetails = getCardDetails()
      })

      beforeEach(async () => {
        const collections = await paymentService.createPaymentCollections([
          collectionInput,
        ])
        const collection = collections[0]

        session = await paymentService.createPaymentSession(collection.id, {
          amount: collection.amount,
          currency_code: collection.currency_code,
          data: {
            request: {
              paymentMethod: encryptedCardDetails,
            },
          },
          provider_id,
        })

        reference = session.id
        await delay(1000)
      })

      describe('Without Errors', () => {
        describe('Test processing cancellation notification', () => {
          it('updates all payment data models to reflect the change after a success cancellation notification is processed without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.CANCELED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CANCELED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toEqual(pspReference)
            expect(newCancellations[0].merchantReference).toEqual(reference)
            expect(newCancellations[0].amount.value).toEqual(amount)
            expect(newCancellations[0].amount.currency).toEqual(currency)
            expect(newCancellations[0].status).toEqual('SUCCEEDED')
          })

          it('updates all payment data models to reflect the change after a success technical cancellation notification is processed without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.TechnicalCancel,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.CANCELED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CANCELED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toEqual(pspReference)
            expect(newCancellations[0].merchantReference).toEqual(reference)
            expect(newCancellations[0].amount.value).toEqual(amount)
            expect(newCancellations[0].amount.currency).toEqual(currency)
            expect(newCancellations[0].status).toEqual('SUCCEEDED')
          })

          it('updates all payment data models to reflect the change after a success cancellation notification is processed with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const cancelledSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.CANCELED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(cancelledSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is becuase the Payment Module's bug.
            expect(newSession.status).toEqual(PaymentSessionStatus.CANCELED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toEqual(
              cancelledSession.payment?.canceled_at,
            )
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toEqual(pspReference)
            expect(newCancellations[0].merchantReference).toEqual(reference)
            expect(newCancellations[0].amount.value).toEqual(amount)
            expect(newCancellations[0].amount.currency).toEqual(currency)
            expect(newCancellations[0].status).toEqual('SUCCEEDED')
          })

          it('updates all payment data models to reflect the change after a success technical cancellation notification is processed with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const cancelledSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.TechnicalCancel,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.CANCELED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(cancelledSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is becuase the Payment Module's bug.
            expect(newSession.status).toEqual(PaymentSessionStatus.CANCELED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toEqual(
              cancelledSession.payment?.canceled_at,
            )
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toEqual(pspReference)
            expect(newCancellations[0].merchantReference).toEqual(reference)
            expect(newCancellations[0].amount.value).toEqual(amount)
            expect(newCancellations[0].amount.currency).toEqual(currency)
            expect(newCancellations[0].status).toEqual('SUCCEEDED')
          })

          it('updates all payment data models to reflect the change after a failed cancellation notification is processed without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(newSession.payment?.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toEqual(pspReference)
            expect(newCancellations[0].merchantReference).toEqual(reference)
            expect(newCancellations[0].amount.value).toEqual(amount)
            expect(newCancellations[0].amount.currency).toEqual(currency)
            expect(newCancellations[0].status).toEqual('FAILED')
          })

          it('updates all payment data models to reflect the change after a failed technical cancellation notification is processed without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.TechnicalCancel,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(newSession.payment?.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toEqual(pspReference)
            expect(newCancellations[0].merchantReference).toEqual(reference)
            expect(newCancellations[0].amount.value).toEqual(amount)
            expect(newCancellations[0].amount.currency).toEqual(currency)
            expect(newCancellations[0].status).toEqual('FAILED')
          })

          it('updates all payment data models to reflect the change after a failed cancellation notification is processed with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const cancelledSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(cancelledSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is becuase the Payment Module's bug.
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toEqual(pspReference)
            expect(newCancellations[0].merchantReference).toEqual(reference)
            expect(newCancellations[0].amount.value).toEqual(amount)
            expect(newCancellations[0].amount.currency).toEqual(currency)
            expect(newCancellations[0].status).toEqual('FAILED')
          })

          it('updates all payment data models to reflect the change after a failed technical cancellation notification is processed with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const cancelledSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.TechnicalCancel,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(cancelledSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is becuase the Payment Module's bug.
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toEqual(pspReference)
            expect(newCancellations[0].merchantReference).toEqual(reference)
            expect(newCancellations[0].amount.value).toEqual(amount)
            expect(newCancellations[0].amount.currency).toEqual(currency)
            expect(newCancellations[0].status).toEqual('FAILED')
          })
        })

        describe('Test processing capture notification', () => {
          it('updates all payment data models to reflect the change after a success capture notification is processed without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment', 'payment.captures'],
              })

            const pspReference = 'pspReference'

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

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const newCaptures = filter(newSession.payment?.data?.events, {
              name: 'CAPTURE',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(authorizedSession.payment?.captured_at).toBeNull()
            expect(newSession.payment?.captured_at).toBeDefined()
            expect(authorizedSession.payment?.captures).toHaveLength(0)
            expect(newSession.payment?.captures).toHaveLength(1)
            expect(newCaptures).toHaveLength(1)
            expect(newCaptures[0].id).toEqual(
              newSession.payment?.captures?.[0].id,
            )
            expect(newCaptures[0].providerReference).toEqual(pspReference)
            expect(newCaptures[0].merchantReference).toEqual(reference)
            expect(newCaptures[0].amount.value).toEqual(amount)
            expect(newCaptures[0].amount.currency).toEqual(currency)
            expect(newCaptures[0].status).toEqual('SUCCEEDED')
          })

          it('updates all payment data models to reflect the change after a success capture notification is processed with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment', 'payment.captures'],
              })

            await paymentService.capturePayment({ payment_id: payment.id })

            const capturedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const capturedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const originalCaptures = filter(
              capturedSession.payment?.data?.events,
              {
                name: 'CAPTURE',
              },
            )

            const notification = getNotificationRequestItem(
              originalCaptures[0].providerReference,
              originalCaptures[0].merchantReference,
              originalCaptures[0].amount.value,
              originalCaptures[0].amount.currency,
              EventCodeEnum.Capture,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const newCaptures = filter(newSession.payment?.data?.events, {
              name: 'CAPTURE',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is because of the Payment Module's bug.
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(authorizedSession.payment?.captured_at).toBeNull()
            expect(capturedSession.payment?.captured_at).toBeDefined()
            expect(newSession.payment?.captured_at).toBeDefined()
            expect(authorizedSession.payment?.captures).toHaveLength(0)
            expect(capturedSession.payment?.captures).toHaveLength(1)
            expect(newSession.payment?.captures).toHaveLength(1)
            expect(newCaptures).toHaveLength(1)
            expect(newCaptures[0].id).toEqual(
              newSession.payment?.captures?.[0].id,
            )
            expect(newCaptures[0].providerReference).toEqual(
              originalCaptures[0].providerReference,
            )
            expect(newCaptures[0].merchantReference).toEqual(
              originalCaptures[0].merchantReference,
            )
            expect(newCaptures[0].amount.value).toEqual(
              originalCaptures[0].amount.value,
            )
            expect(newCaptures[0].amount.currency).toEqual(
              originalCaptures[0].amount.currency,
            )
            expect(originalCaptures[0].status).toEqual('REQUESTED')
            expect(newCaptures[0].status).toEqual('SUCCEEDED')
          })

          it('updates all payment data models to reflect the change after a failed capture notification is processed without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment', 'payment.captures'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Capture,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const newCaptures = filter(newSession.payment?.data?.events, {
              name: 'CAPTURE',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.captured_at).toBeNull()
            expect(newSession.payment?.captured_at).toBeNull()
            expect(authorizedSession.payment?.captures).toHaveLength(0)
            expect(newSession.payment?.captures).toHaveLength(0)
            expect(newCaptures).toHaveLength(1)
            expect(newCaptures[0].id).toEqual('MISSING')
            expect(newCaptures[0].providerReference).toEqual(pspReference)
            expect(newCaptures[0].merchantReference).toEqual(reference)
            expect(newCaptures[0].amount.value).toEqual(amount)
            expect(newCaptures[0].amount.currency).toEqual(currency)
            expect(newCaptures[0].status).toEqual('FAILED')
          })

          it('updates all payment data models to reflect the change after a success capture failed notification is processed without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment', 'payment.captures'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.CaptureFailed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const newCaptures = filter(newSession.payment?.data?.events, {
              name: 'CAPTURE',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.captured_at).toBeNull()
            expect(newSession.payment?.captured_at).toBeNull()
            expect(authorizedSession.payment?.captures).toHaveLength(0)
            expect(newSession.payment?.captures).toHaveLength(0)
            expect(newCaptures).toHaveLength(1)
            expect(newCaptures[0].id).toEqual('MISSING')
            expect(newCaptures[0].providerReference).toEqual(pspReference)
            expect(newCaptures[0].merchantReference).toEqual(reference)
            expect(newCaptures[0].amount.value).toEqual(amount)
            expect(newCaptures[0].amount.currency).toEqual(currency)
            expect(newCaptures[0].status).toEqual('FAILED')
          })

          it('updates all payment data models to reflect the change after a failed capture notification is processed with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment', 'payment.captures'],
              })

            await paymentService.capturePayment({ payment_id: payment.id })

            const capturedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const capturedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const originalCaptures = filter(
              capturedSession.payment?.data?.events,
              {
                name: 'CAPTURE',
              },
            )

            const notification = getNotificationRequestItem(
              originalCaptures[0].providerReference,
              originalCaptures[0].merchantReference,
              originalCaptures[0].amount.value,
              originalCaptures[0].amount.currency,
              EventCodeEnum.Capture,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const newCaptures = filter(newSession.payment?.data?.events, {
              name: 'CAPTURE',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is because of the Payment Module's bug.
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.captured_at).toBeNull()
            expect(capturedSession.payment?.captured_at).toBeDefined()
            expect(newSession.payment?.captured_at).toBeNull()
            expect(authorizedSession.payment?.captures).toHaveLength(0)
            expect(capturedSession.payment?.captures).toHaveLength(1)
            expect(newSession.payment?.captures).toHaveLength(0)
            expect(newCaptures).toHaveLength(1)
            expect(newCaptures[0].id).toEqual('MISSING')
            expect(newCaptures[0].providerReference).toEqual(
              originalCaptures[0].providerReference,
            )
            expect(newCaptures[0].merchantReference).toEqual(
              originalCaptures[0].merchantReference,
            )
            expect(newCaptures[0].amount.value).toEqual(
              originalCaptures[0].amount.value,
            )
            expect(newCaptures[0].amount.currency).toEqual(
              originalCaptures[0].amount.currency,
            )
            expect(originalCaptures[0].status).toEqual('REQUESTED')
            expect(newCaptures[0].status).toEqual('FAILED')
          })

          it('updates all payment data models to reflect the change after a success capture failed notification is processed with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const authorizedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment', 'payment.captures'],
              })

            await paymentService.capturePayment({ payment_id: payment.id })

            const capturedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const capturedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const originalCaptures = filter(
              capturedSession.payment?.data?.events,
              {
                name: 'CAPTURE',
              },
            )

            const notification = getNotificationRequestItem(
              originalCaptures[0].providerReference,
              originalCaptures[0].merchantReference,
              originalCaptures[0].amount.value,
              originalCaptures[0].amount.currency,
              EventCodeEnum.CaptureFailed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.captures'],
              },
            )

            const newCaptures = filter(newSession.payment?.data?.events, {
              name: 'CAPTURE',
            })

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is because of the Payment Module's bug.
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.captured_at).toBeNull()
            expect(capturedSession.payment?.captured_at).toBeDefined()
            expect(newSession.payment?.captured_at).toBeNull()
            expect(authorizedSession.payment?.captures).toHaveLength(0)
            expect(capturedSession.payment?.captures).toHaveLength(1)
            expect(newSession.payment?.captures).toHaveLength(0)
            expect(newCaptures).toHaveLength(1)
            expect(newCaptures[0].id).toEqual('MISSING')
            expect(newCaptures[0].providerReference).toEqual(
              originalCaptures[0].providerReference,
            )
            expect(newCaptures[0].merchantReference).toEqual(
              originalCaptures[0].merchantReference,
            )
            expect(newCaptures[0].amount.value).toEqual(
              originalCaptures[0].amount.value,
            )
            expect(newCaptures[0].amount.currency).toEqual(
              originalCaptures[0].amount.currency,
            )
            expect(originalCaptures[0].status).toEqual('REQUESTED')
            expect(newCaptures[0].status).toEqual('FAILED')
          })
        })

        describe('Test processing refund notification', () => {
          it('updates all payment data models to reflect the change after a success refund notification is processed without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const capturedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const capturedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Refund,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            const newRefunds = filter(newSession.payment?.data?.events, {
              name: 'REFUND',
            })

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            // This is because of the Payment Module's bug.
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession.payment?.refunds).toHaveLength(0)
            expect(newSession.payment?.refunds).toHaveLength(1)
            expect(newRefunds).toHaveLength(1)
            expect(newRefunds[0].id).toEqual(
              newSession.payment?.refunds?.[0].id,
            )
            expect(newRefunds[0].providerReference).toEqual(pspReference)
            expect(newRefunds[0].merchantReference).toEqual(reference)
            expect(newRefunds[0].amount.value).toEqual(amount)
            expect(newRefunds[0].amount.currency).toEqual(currency)
            expect(newRefunds[0].status).toEqual('SUCCEEDED')
          })

          it('updates all payment data models to reflect the change after a success refund notification is processed with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const capturedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const capturedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            await paymentService.refundPayment({ payment_id: payment.id })

            const refundedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const refundedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            const originalRefunds = filter(
              refundedSession.payment?.data?.events,
              {
                name: 'REFUND',
              },
            )

            const notification = getNotificationRequestItem(
              originalRefunds[0].providerReference,
              originalRefunds[0].merchantReference,
              originalRefunds[0].amount.value,
              originalRefunds[0].amount.currency,
              EventCodeEnum.Refund,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            const newRefunds = filter(newSession.payment?.data?.events, {
              name: 'REFUND',
            })

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            // This is because of the Payment Module's bug.
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            // This is because of the Payment Module's bug.
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)

            expect(capturedSession.payment?.refunds).toHaveLength(0)
            expect(refundedSession.payment?.refunds).toHaveLength(1)
            expect(newSession.payment?.refunds).toHaveLength(1)
            expect(newRefunds).toHaveLength(1)
            expect(newRefunds[0].id).toEqual(
              newSession.payment?.refunds?.[0].id,
            )
            expect(newRefunds[0].providerReference).toEqual(
              originalRefunds[0].providerReference,
            )
            expect(newRefunds[0].merchantReference).toEqual(
              originalRefunds[0].merchantReference,
            )
            expect(newRefunds[0].amount.value).toEqual(
              originalRefunds[0].amount.value,
            )
            expect(newRefunds[0].amount.currency).toEqual(
              originalRefunds[0].amount.currency,
            )
            expect(originalRefunds[0].status).toEqual('REQUESTED')
            expect(newRefunds[0].status).toEqual('SUCCEEDED')
          })

          it('updates all payment data models to reflect the change after a failed refund notification is processed without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const capturedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const capturedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Refund,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            const newRefunds = filter(newSession.payment?.data?.events, {
              name: 'REFUND',
            })

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            // This is because of the Payment Module's bug.
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession.payment?.refunds).toHaveLength(0)
            expect(newSession.payment?.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(1)
            expect(newRefunds[0].id).toEqual('MISSING')
            expect(newRefunds[0].providerReference).toEqual(pspReference)
            expect(newRefunds[0].merchantReference).toEqual(reference)
            expect(newRefunds[0].amount.value).toEqual(amount)
            expect(newRefunds[0].amount.currency).toEqual(currency)
            expect(newRefunds[0].status).toEqual('FAILED')
          })

          it('updates all payment data models to reflect the change after a failed refund notification is processed with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const capturedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const capturedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            await paymentService.refundPayment({ payment_id: payment.id })

            const refundedCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const refundedSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            const originalRefunds = filter(
              refundedSession.payment?.data?.events,
              {
                name: 'REFUND',
              },
            )

            const notification = getNotificationRequestItem(
              originalRefunds[0].providerReference,
              originalRefunds[0].merchantReference,
              originalRefunds[0].amount.value,
              originalRefunds[0].amount.currency,
              EventCodeEnum.Refund,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newCollection =
              await paymentService.retrievePaymentCollection(
                session.payment_collection_id,
              )
            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              {
                relations: ['payment', 'payment.refunds'],
              },
            )

            const newRefunds = filter(newSession.payment?.data?.events, {
              name: 'REFUND',
            })

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            // This is because of the Payment Module's bug.
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            // This is because of the Payment Module's bug.
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)

            expect(capturedSession.payment?.refunds).toHaveLength(0)
            expect(refundedSession.payment?.refunds).toHaveLength(1)
            expect(newSession.payment?.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(1)
            expect(newRefunds[0].id).toEqual('MISSING')
            expect(newRefunds[0].providerReference).toEqual(
              originalRefunds[0].providerReference,
            )
            expect(newRefunds[0].merchantReference).toEqual(
              originalRefunds[0].merchantReference,
            )
            expect(newRefunds[0].amount.value).toEqual(
              originalRefunds[0].amount.value,
            )
            expect(newRefunds[0].amount.currency).toEqual(
              originalRefunds[0].amount.currency,
            )
            expect(originalRefunds[0].status).toEqual('REQUESTED')
            expect(newRefunds[0].status).toEqual('FAILED')
          })
        })
      })

      describe('With Errors', () => {
        beforeAll(async () => {
          /**
           * There's a bug in the createWorkflow function that prevents
           * custom workflow hooks from being registered inside integration tests.
           *
           * Refer to the BUGS.md file for the details of how to fix it.
           */
          const workflowDef = WorkflowManager.getWorkflow(
            'process-notification-workflow',
          )

          if (!workflowDef) {
            throw new Error('Workflow not found in WorkflowManager')
          }

          const hookHandler = (input: NotificationRequestItem) => {
            console.log(
              'processNotificationWorkflow/hooks/notificationProcessed/input',
              JSON.stringify(input, null, 2),
            )
            throw new MedusaError(
              MedusaError.Types.NOT_ALLOWED,
              'processNotificationWorkflow/hooks/notificationProcessed/error',
            )
          }

          processNotificationWorkflow.hooks.notificationProcessed(hookHandler)

          const handler = {
            compensate: undefined,
            invoke: async (stepArguments: any) => {
              let input = stepArguments.payload

              if (
                input?.__type === OrchestrationUtils.SymbolWorkflowWorkflowData
              ) {
                input = input.output
              }

              await hookHandler(input)

              return {
                __type: OrchestrationUtils.SymbolWorkflowWorkflowData,
                output: undefined,
              }
            },
          }

          workflowDef.handlers_.set('notificationProcessed', handler)
        })

        describe('Test processing cancellation notification', () => {
          it('preserves the original state of the payment data models after a success cancellation notification processing fails without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(authorizedSession.status).toBe(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toBe(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(newSession.payment?.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after a success cancellation notification processing fails with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const cancelledSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])

            expect(authorizedSession.status).toBe(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(cancelledSession.status).toBe(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is becuase the Payment Module's bug. The session is not updated after the cancelPayment call.
            expect(newSession.status).toBe(PaymentSessionStatus.CANCELED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toEqual(
              cancelledSession.payment?.canceled_at,
            )
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after a failed cancellation notification processing fails without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(authorizedSession.status).toBe(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toBe(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(newSession.payment?.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after a failed cancellation notification processing fails with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const authorizedSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const cancelledSession =
              await paymentService.retrievePaymentSession(session.id, {
                relations: ['payment'],
              })

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newSession = await paymentService.retrievePaymentSession(
              session.id,
              { relations: ['payment'] },
            )

            const newCancellations = filter(newSession.payment?.data?.events, {
              name: 'CANCELLATION',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(authorizedSession.status).toBe(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(cancelledSession.status).toBe(
              PaymentSessionStatus.AUTHORIZED,
            ) // This is becuase the Payment Module's bug. The session is not updated after the cancelPayment call.
            expect(newSession.status).toBe(PaymentSessionStatus.CANCELED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toEqual(
              cancelledSession.payment?.canceled_at,
            )
            expect(newCancellations).toHaveLength(0)
          })
        })

        describe('Test processing capture notification', () => {
          it('preserves the original state of the payment data models after a success capture notification processing fails without prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Capture,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )

            const newCaptures = filter(newPayment.data?.events, {
              name: 'CAPTURE',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(newPayment.captures).toHaveLength(0)
            expect(newCaptures).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after a success capture notification processing fails with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )

            const originalCaptures = filter(originalPayment.data?.events, {
              name: 'CAPTURE',
            })

            const notification = getNotificationRequestItem(
              originalCaptures[0].providerReference,
              originalCaptures[0].merchantReference,
              originalCaptures[0].amount.value,
              originalCaptures[0].amount.currency,
              EventCodeEnum.Capture,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )
            const newCaptures = filter(newPayment.data?.events, {
              name: 'CAPTURE',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(originalPayment.captures).toHaveLength(1)
            expect(newPayment.captures).toHaveLength(1)
            expect(originalCaptures).toHaveLength(1)
            expect(newCaptures).toHaveLength(1)
            expect(originalCaptures[0].status).toBe('REQUESTED')
            expect(newCaptures[0].status).toBe('REQUESTED')
          })

          it('preserves the original state of the payment data models after a failed capture notification processing fails without prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Capture,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )

            const newCaptures = filter(newPayment.data?.events, {
              name: 'CAPTURE',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(newPayment.captures).toHaveLength(0)
            expect(newCaptures).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after a failed capture notification processing fails with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )

            const originalCaptures = filter(originalPayment.data?.events, {
              name: 'CAPTURE',
            })

            const notification = getNotificationRequestItem(
              originalCaptures[0].providerReference,
              originalCaptures[0].merchantReference,
              originalCaptures[0].amount.value,
              originalCaptures[0].amount.currency,
              EventCodeEnum.Capture,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )
            const newCaptures = filter(newPayment.data?.events, {
              name: 'CAPTURE',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(originalPayment.captures).toHaveLength(1)
            expect(newPayment.captures).toHaveLength(1)
            expect(originalCaptures).toHaveLength(1)
            expect(newCaptures).toHaveLength(1)
            expect(originalCaptures[0].status).toBe('REQUESTED')
            expect(newCaptures[0].status).toBe('REQUESTED')
          })
        })

        describe('Test processing refund notification', () => {
          it('preserves the original state of the payment data models after a success refund notification processing fails without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Refund,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const newRefunds = filter(newPayment.data?.events, {
              name: 'REFUND',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(originalPayment.refunds).toHaveLength(0)
            expect(newPayment.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after a success refund notification processing fails with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })
            await paymentService.refundPayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const originalRefunds = filter(originalPayment.data?.events, {
              name: 'REFUND',
            })

            const notification = getNotificationRequestItem(
              originalRefunds[0].providerReference,
              originalRefunds[0].merchantReference,
              originalRefunds[0].amount.value,
              originalRefunds[0].amount.currency,
              EventCodeEnum.Refund,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )
            const newRefunds = filter(newPayment.data?.events, {
              name: 'REFUND',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(originalPayment.refunds).toHaveLength(1)
            expect(newPayment.refunds).toHaveLength(1)
            expect(originalRefunds).toHaveLength(1)
            expect(newRefunds).toHaveLength(1)
            expect(originalRefunds[0].status).toBe('REQUESTED')
            expect(newRefunds[0].status).toBe('REQUESTED')
          })

          it('preserves the original state of the payment data models after a failed refund notification processing fails without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Refund,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const newRefunds = filter(newPayment.data?.events, {
              name: 'REFUND',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(originalPayment.refunds).toHaveLength(0)
            expect(newPayment.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after a failed refund notification processing fails with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })
            await paymentService.refundPayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const originalRefunds = filter(originalPayment.data?.events, {
              name: 'REFUND',
            })

            const notification = getNotificationRequestItem(
              originalRefunds[0].providerReference,
              originalRefunds[0].merchantReference,
              originalRefunds[0].amount.value,
              originalRefunds[0].amount.currency,
              EventCodeEnum.Refund,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )
            const newRefunds = filter(newPayment.data?.events, {
              name: 'REFUND',
            })

            expect(errors).toEqual([
              {
                action: 'notificationProcessed',
                error: expect.objectContaining({
                  message:
                    'processNotificationWorkflow/hooks/notificationProcessed/error',
                }),
                handlerType: 'invoke',
              },
            ])
            expect(originalPayment.refunds).toHaveLength(1)
            expect(newPayment.refunds).toHaveLength(1)
            expect(originalRefunds).toHaveLength(1)
            expect(newRefunds).toHaveLength(1)
            expect(originalRefunds[0].status).toBe('REQUESTED')
            expect(newRefunds[0].status).toBe('REQUESTED')
          })
        })
      })
    })
  },
})

jest.setTimeout(120 * 1000)

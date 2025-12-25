import { Types } from '@adyen/api-library'
import type {
  IPaymentModuleService,
  MedusaContainer,
  PaymentCollectionDTO,
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

      const retrievePaymentData = async (
        collectionId: string,
        sessionId: string,
        eventName?: string,
      ): Promise<[PaymentCollectionDTO, PaymentSessionDTO, Event[]]> => {
        const collection =
          await paymentService.retrievePaymentCollection(collectionId)
        const session = await paymentService.retrievePaymentSession(sessionId, {
          relations: ['payment', 'payment.captures', 'payment.refunds'],
        })
        const events = session.payment?.data?.events || []
        const filteredEvents = eventName
          ? filter(events, { name: eventName })
          : events

        return [collection, session, filteredEvents]
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
        describe('Test processing authorisation notification', () => {
          it('updates payment data models to reflect the change after a success authorisation notification is processed with prior direct authorisation', async () => {
            await paymentService.authorizePaymentSession(session.id, {})

            const [
              authorizedCollection,
              authorizedSession,
              originalAuthorisations,
            ] = await retrievePaymentData(
              session.payment_collection_id,
              session.id,
              'AUTHORISATION',
            )

            const notification = getNotificationRequestItem(
              originalAuthorisations[0].providerReference,
              originalAuthorisations[0].merchantReference,
              originalAuthorisations[0].amount.value,
              originalAuthorisations[0].amount.currency,
              EventCodeEnum.Authorisation,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const [newCollection, newSession, newAuthorisations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'AUTHORISATION',
              )

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
            expect(authorizedSession.authorized_at).toBeDefined()
            expect(newSession.authorized_at).toBeDefined()
            expect(newSession.authorized_at).toEqual(
              authorizedSession.authorized_at,
            )
            expect(newAuthorisations).toHaveLength(1)
            expect(newAuthorisations[0].providerReference).toEqual(
              originalAuthorisations[0].providerReference,
            )
            expect(newAuthorisations[0].merchantReference).toEqual(
              originalAuthorisations[0].merchantReference,
            )
            expect(newAuthorisations[0].amount.value).toEqual(
              originalAuthorisations[0].amount.value,
            )
            expect(newAuthorisations[0].amount.currency).toEqual(
              originalAuthorisations[0].amount.currency,
            )
            expect(originalAuthorisations[0].status).toEqual('SUCCEEDED')
            expect(newAuthorisations[0].status).toEqual('SUCCEEDED')
          })

          it('updates payment data models to reflect the change after a failed authorisation notification is processed with prior direct authorisation', async () => {
            await paymentService.authorizePaymentSession(session.id, {})

            const [
              authorizedCollection,
              authorizedSession,
              originalAuthorisations,
            ] = await retrievePaymentData(
              session.payment_collection_id,
              session.id,
              'AUTHORISATION',
            )

            const notification = getNotificationRequestItem(
              originalAuthorisations[0].providerReference,
              originalAuthorisations[0].merchantReference,
              originalAuthorisations[0].amount.value,
              originalAuthorisations[0].amount.currency,
              EventCodeEnum.Authorisation,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const [newCollection, newSession, newAuthorisations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'AUTHORISATION',
              )

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.AWAITING,
            )
            expect(authorizedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.ERROR)
            expect(authorizedSession.authorized_at).toBeDefined()
            expect(newSession.authorized_at).toBeDefined()
            expect(newAuthorisations).toHaveLength(1)
            expect(newAuthorisations[0].providerReference).toEqual(
              originalAuthorisations[0].providerReference,
            )
            expect(newAuthorisations[0].merchantReference).toEqual(
              originalAuthorisations[0].merchantReference,
            )
            expect(newAuthorisations[0].amount.value).toEqual(
              originalAuthorisations[0].amount.value,
            )
            expect(newAuthorisations[0].amount.currency).toEqual(
              originalAuthorisations[0].amount.currency,
            )
            expect(originalAuthorisations[0].status).toEqual('SUCCEEDED')
            expect(newAuthorisations[0].status).toEqual('FAILED')
          })
        })

        describe('Test processing cancellation notification', () => {
          it('updates payment data models to reflect the change after a success cancellation notification is processed without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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

          it('updates payment data models to reflect the change after a success cancellation notification is processed with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const [cancelledCollection, cancelledSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(cancelledCollection.status).toEqual(
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
            )
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

          it('updates payment data models to reflect the change after a failed cancellation notification is processed without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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

          it('updates payment data models to reflect the change after a failed cancellation notification is processed with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const [cancelledCollection, cancelledSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(cancelledCollection.status).toEqual(
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
            )
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

          it('updates payment data models to reflect the change after a success technical cancellation notification is processed without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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

          it('updates payment data models to reflect the change after a success technical cancellation notification is processed with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const [cancelledCollection, cancelledSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(cancelledCollection.status).toEqual(
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
            )
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

          it('updates payment data models to reflect the change after a failed technical cancellation notification is processed without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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

          it('updates payment data models to reflect the change after a failed technical cancellation notification is processed with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const [cancelledCollection, cancelledSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(cancelledCollection.status).toEqual(
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
            )
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
          it('updates payment data models to reflect the change after a success capture notification is processed without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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

          it('updates payment data models to reflect the change after a success capture notification is processed with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession, originalCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
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

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            )
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

          it('updates payment data models to reflect the change after a failed capture notification is processed without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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

          it('updates payment data models to reflect the change after a failed capture notification is processed with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession, originalCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
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

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            )
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

          it('updates payment data models to reflect the change after a success capture failed notification is processed without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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

          it('updates payment data models to reflect the change after a success capture failed notification is processed with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession, originalCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
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

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            )
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
          it('updates payment data models to reflect the change after a success refund notification is processed without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
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

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession).toHaveProperty('data.request')
            expect(capturedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(capturedSession).toHaveProperty('data.session_id')
            expect(newSession).not.toHaveProperty('data.request')
            expect(newSession).not.toHaveProperty('data.paymentMethodsResponse')
            expect(newSession).not.toHaveProperty('data.session_id')
            expect(capturedSession).not.toHaveProperty('payment.data.request')
            expect(capturedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(capturedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(newSession).not.toHaveProperty('payment.data.request')
            expect(newSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(newSession).not.toHaveProperty('payment.data.session_id')
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

          it('updates payment data models to reflect the change after a success refund notification is processed with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.refundPayment({ payment_id: payment.id })

            const [refundedCollection, refundedSession, originalRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
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

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession).toHaveProperty('data.request')
            expect(capturedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(capturedSession).toHaveProperty('data.session_id')
            expect(refundedSession).toHaveProperty('data.request')
            expect(refundedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(refundedSession).toHaveProperty('data.session_id')
            expect(newSession).not.toHaveProperty('data.request')
            expect(newSession).not.toHaveProperty('data.paymentMethodsResponse')
            expect(newSession).not.toHaveProperty('data.session_id')
            expect(capturedSession).not.toHaveProperty('payment.data.request')
            expect(capturedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(capturedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(refundedSession).not.toHaveProperty('payment.data.request')
            expect(refundedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(refundedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(newSession).not.toHaveProperty('payment.data.request')
            expect(newSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(newSession).not.toHaveProperty('payment.data.session_id')

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

          it('updates payment data models to reflect the change after a failed refund notification is processed without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
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

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession).toHaveProperty('data.request')
            expect(capturedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(capturedSession).toHaveProperty('data.session_id')
            expect(newSession).not.toHaveProperty('data.request')
            expect(newSession).not.toHaveProperty('data.paymentMethodsResponse')
            expect(newSession).not.toHaveProperty('data.session_id')
            expect(capturedSession).not.toHaveProperty('payment.data.request')
            expect(capturedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(capturedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(newSession).not.toHaveProperty('payment.data.request')
            expect(newSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(newSession).not.toHaveProperty('payment.data.session_id')
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

          it('updates payment data models to reflect the change after a failed refund notification is processed with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.refundPayment({ payment_id: payment.id })

            const [refundedCollection, refundedSession, originalRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
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

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession).toHaveProperty('data.request')
            expect(capturedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(capturedSession).toHaveProperty('data.session_id')
            expect(refundedSession).toHaveProperty('data.request')
            expect(refundedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(refundedSession).toHaveProperty('data.session_id')
            expect(newSession).not.toHaveProperty('data.request')
            expect(newSession).not.toHaveProperty('data.paymentMethodsResponse')
            expect(newSession).not.toHaveProperty('data.session_id')
            expect(capturedSession).not.toHaveProperty('payment.data.request')
            expect(capturedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(capturedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(refundedSession).not.toHaveProperty('payment.data.request')
            expect(refundedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(refundedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(newSession).not.toHaveProperty('payment.data.request')
            expect(newSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(newSession).not.toHaveProperty('payment.data.session_id')

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

          it('updates payment data models to reflect the change after a success refund failed notification is processed without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.RefundFailed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession).toHaveProperty('data.request')
            expect(capturedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(capturedSession).toHaveProperty('data.session_id')
            expect(newSession).not.toHaveProperty('data.request')
            expect(newSession).not.toHaveProperty('data.paymentMethodsResponse')
            expect(newSession).not.toHaveProperty('data.session_id')
            expect(capturedSession).not.toHaveProperty('payment.data.request')
            expect(capturedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(capturedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(newSession).not.toHaveProperty('payment.data.request')
            expect(newSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(newSession).not.toHaveProperty('payment.data.session_id')
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

          it('updates payment data models to reflect the change after a success refund failed notification is processed with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.refundPayment({ payment_id: payment.id })

            const [refundedCollection, refundedSession, originalRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            const notification = getNotificationRequestItem(
              originalRefunds[0].providerReference,
              originalRefunds[0].merchantReference,
              originalRefunds[0].amount.value,
              originalRefunds[0].amount.currency,
              EventCodeEnum.RefundFailed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession).toHaveProperty('data.request')
            expect(capturedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(capturedSession).toHaveProperty('data.session_id')
            expect(refundedSession).toHaveProperty('data.request')
            expect(refundedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(refundedSession).toHaveProperty('data.session_id')
            expect(newSession).not.toHaveProperty('data.request')
            expect(newSession).not.toHaveProperty('data.paymentMethodsResponse')
            expect(newSession).not.toHaveProperty('data.session_id')
            expect(capturedSession).not.toHaveProperty('payment.data.request')
            expect(capturedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(capturedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(refundedSession).not.toHaveProperty('payment.data.request')
            expect(refundedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(refundedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(newSession).not.toHaveProperty('payment.data.request')
            expect(newSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(newSession).not.toHaveProperty('payment.data.session_id')

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

          it('updates payment data models to reflect the change after a success refund reversed notification is processed without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.RefundedReversed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession).toHaveProperty('data.request')
            expect(capturedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(capturedSession).toHaveProperty('data.session_id')
            expect(newSession).not.toHaveProperty('data.request')
            expect(newSession).not.toHaveProperty('data.paymentMethodsResponse')
            expect(newSession).not.toHaveProperty('data.session_id')
            expect(capturedSession).not.toHaveProperty('payment.data.request')
            expect(capturedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(capturedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(newSession).not.toHaveProperty('payment.data.request')
            expect(newSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(newSession).not.toHaveProperty('payment.data.session_id')
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

          it('updates payment data models to reflect the change after a success refund reversed notification is processed with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.refundPayment({ payment_id: payment.id })

            const [refundedCollection, refundedSession, originalRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            const notification = getNotificationRequestItem(
              originalRefunds[0].providerReference,
              originalRefunds[0].merchantReference,
              originalRefunds[0].amount.value,
              originalRefunds[0].amount.currency,
              EventCodeEnum.RefundedReversed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.CAPTURED)
            expect(capturedSession).toHaveProperty('data.request')
            expect(capturedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(capturedSession).toHaveProperty('data.session_id')
            expect(refundedSession).toHaveProperty('data.request')
            expect(refundedSession).toHaveProperty(
              'data.paymentMethodsResponse',
            )
            expect(refundedSession).toHaveProperty('data.session_id')
            expect(newSession).not.toHaveProperty('data.request')
            expect(newSession).not.toHaveProperty('data.paymentMethodsResponse')
            expect(newSession).not.toHaveProperty('data.session_id')
            expect(capturedSession).not.toHaveProperty('payment.data.request')
            expect(capturedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(capturedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(refundedSession).not.toHaveProperty('payment.data.request')
            expect(refundedSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(refundedSession).not.toHaveProperty(
              'payment.data.session_id',
            )
            expect(newSession).not.toHaveProperty('payment.data.request')
            expect(newSession).not.toHaveProperty(
              'payment.data.paymentMethodsResponse',
            )
            expect(newSession).not.toHaveProperty('payment.data.session_id')

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

        describe('Test processing authorisation notification', () => {
          it('preserves the original state of the payment data models after success authorisation notification processing fails with prior direct authorisation', async () => {
            await paymentService.authorizePaymentSession(session.id, {})

            const [
              authorizedCollection,
              authorizedSession,
              originalAuthorisations,
            ] = await retrievePaymentData(
              session.payment_collection_id,
              session.id,
              'AUTHORISATION',
            )

            const notification = getNotificationRequestItem(
              originalAuthorisations[0].providerReference,
              originalAuthorisations[0].merchantReference,
              originalAuthorisations[0].amount.value,
              originalAuthorisations[0].amount.currency,
              EventCodeEnum.Authorisation,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newAuthorisations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'AUTHORISATION',
              )

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
            expect(authorizedSession.authorized_at).toBeDefined()
            expect(newSession.authorized_at).toBeDefined()
            expect(newSession.authorized_at).toEqual(
              authorizedSession.authorized_at,
            )
            expect(newAuthorisations).toHaveLength(1)
            expect(newAuthorisations[0].providerReference).toEqual(
              originalAuthorisations[0].providerReference,
            )
            expect(newAuthorisations[0].merchantReference).toEqual(
              originalAuthorisations[0].merchantReference,
            )
            expect(newAuthorisations[0].amount.value).toEqual(
              originalAuthorisations[0].amount.value,
            )
            expect(newAuthorisations[0].amount.currency).toEqual(
              originalAuthorisations[0].amount.currency,
            )
            expect(originalAuthorisations[0].status).toEqual('SUCCEEDED')
            expect(newAuthorisations[0].status).toEqual('SUCCEEDED')
          })

          it('preserves the original state of the payment data models after failed authorisation notification processing fails with prior direct authorisation', async () => {
            await paymentService.authorizePaymentSession(session.id, {})

            const [
              authorizedCollection,
              authorizedSession,
              originalAuthorisations,
            ] = await retrievePaymentData(
              session.payment_collection_id,
              session.id,
              'AUTHORISATION',
            )

            const notification = getNotificationRequestItem(
              originalAuthorisations[0].providerReference,
              originalAuthorisations[0].merchantReference,
              originalAuthorisations[0].amount.value,
              originalAuthorisations[0].amount.currency,
              EventCodeEnum.Authorisation,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newAuthorisations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'AUTHORISATION',
              )

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
            expect(authorizedSession.authorized_at).toBeDefined()
            expect(newSession.authorized_at).toBeDefined()
            expect(newAuthorisations).toHaveLength(1)
            expect(newAuthorisations[0].providerReference).toEqual(
              originalAuthorisations[0].providerReference,
            )
            expect(newAuthorisations[0].merchantReference).toEqual(
              originalAuthorisations[0].merchantReference,
            )
            expect(newAuthorisations[0].amount.value).toEqual(
              originalAuthorisations[0].amount.value,
            )
            expect(newAuthorisations[0].amount.currency).toEqual(
              originalAuthorisations[0].amount.currency,
            )
            expect(originalAuthorisations[0].status).toEqual('SUCCEEDED')
            expect(newAuthorisations[0].status).toEqual('SUCCEEDED')
          })
        })

        describe('Test processing cancellation notification', () => {
          it('preserves the original state of the payment data models after success cancellation notification processing fails without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after success cancellation notification processing fails with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const [cancelledCollection, cancelledSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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
            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(cancelledCollection.status).toEqual(
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
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toEqual(
              cancelledSession.payment?.canceled_at,
            )
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after failed cancellation notification processing fails without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after failed cancellation notification processing fails with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const [cancelledCollection, cancelledSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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
            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(cancelledCollection.status).toEqual(
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
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after success technical cancellation notification processing fails without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after success technical cancellation notification processing fails with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const [cancelledCollection, cancelledSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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
            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(cancelledCollection.status).toEqual(
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
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toEqual(
              cancelledSession.payment?.canceled_at,
            )
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after failed technical cancellation notification processing fails without prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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
            expect(newCancellations).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after failed technical cancellation notification processing fails with prior direct cancellation', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.cancelPayment(authorizedSession.payment!.id)

            const [cancelledCollection, cancelledSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newCancellations] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CANCELLATION',
              )

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
            expect(authorizedCollection.status).toEqual(
              PaymentCollectionStatus.AUTHORIZED,
            )
            expect(cancelledCollection.status).toEqual(
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
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(authorizedSession.payment?.canceled_at).toBeNull()
            expect(cancelledSession.payment?.canceled_at).toBeDefined()
            expect(newSession.payment?.canceled_at).toBeDefined()
            expect(newCancellations).toHaveLength(0)
          })
        })

        describe('Test processing capture notification', () => {
          it('preserves the original state of the payment data models after success capture notification processing fails without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            expect(newCaptures).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after success capture notification processing fails with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession, originalCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
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
            expect(newCaptures[0].status).toEqual('REQUESTED')
          })

          it('preserves the original state of the payment data models after failed capture notification processing fails without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            expect(newCaptures).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after failed capture notification processing fails with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession, originalCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
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
            expect(newCaptures[0].status).toEqual('REQUESTED')
          })

          it('preserves the original state of the payment data models after success capture failed notification processing fails without prior direct capture', async () => {
            await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            expect(newCaptures).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after success capture failed notification processing fails with prior direct capture', async () => {
            const payment = await authorizePaymentSession(session.id)

            const [authorizedCollection, authorizedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession, originalCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newCaptures] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'CAPTURE',
              )

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
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
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
            expect(newCaptures[0].status).toEqual('REQUESTED')
          })
        })

        describe('Test processing refund notification', () => {
          it('preserves the original state of the payment data models after success refund notification processing fails without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
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

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

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
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(capturedSession.payment?.refunds).toHaveLength(0)
            expect(newSession.payment?.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after success refund notification processing fails with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.refundPayment({ payment_id: payment.id })

            const [refundedCollection, refundedSession, originalRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

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
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)

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
            expect(newRefunds[0].status).toEqual('REQUESTED')
          })

          it('preserves the original state of the payment data models after failed refund notification processing fails without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
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

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

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
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(capturedSession.payment?.refunds).toHaveLength(0)
            expect(newSession.payment?.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after failed refund notification processing fails with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.refundPayment({ payment_id: payment.id })

            const [refundedCollection, refundedSession, originalRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

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
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)

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
            expect(newRefunds[0].status).toEqual('REQUESTED')
          })

          it('preserves the original state of the payment data models after success refund failed notification processing fails without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.RefundFailed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

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
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(capturedSession.payment?.refunds).toHaveLength(0)
            expect(newSession.payment?.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after success refund failed notification processing fails with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.refundPayment({ payment_id: payment.id })

            const [refundedCollection, refundedSession, originalRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            const notification = getNotificationRequestItem(
              originalRefunds[0].providerReference,
              originalRefunds[0].merchantReference,
              originalRefunds[0].amount.value,
              originalRefunds[0].amount.currency,
              EventCodeEnum.RefundFailed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

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
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)

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
            expect(newRefunds[0].status).toEqual('REQUESTED')
          })

          it('preserves the original state of the payment data models after success refund reversed notification processing fails without prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            const pspReference = 'pspReference'

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.RefundedReversed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

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
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)
            expect(capturedSession.payment?.refunds).toHaveLength(0)
            expect(newSession.payment?.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(0)
          })

          it('preserves the original state of the payment data models after success refund reversed notification processing fails with prior direct refund', async () => {
            const payment = await authorizePaymentSession(session.id)

            await paymentService.capturePayment({ payment_id: payment.id })

            const [capturedCollection, capturedSession] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
              )

            await paymentService.refundPayment({ payment_id: payment.id })

            const [refundedCollection, refundedSession, originalRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

            const notification = getNotificationRequestItem(
              originalRefunds[0].providerReference,
              originalRefunds[0].merchantReference,
              originalRefunds[0].amount.value,
              originalRefunds[0].amount.currency,
              EventCodeEnum.RefundedReversed,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const [newCollection, newSession, newRefunds] =
              await retrievePaymentData(
                session.payment_collection_id,
                session.id,
                'REFUND',
              )

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
            expect(capturedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(refundedCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(newCollection.status).toEqual(
              PaymentCollectionStatus.COMPLETED,
            )
            expect(capturedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(refundedSession.status).toEqual(
              PaymentSessionStatus.AUTHORIZED,
            )
            expect(newSession.status).toEqual(PaymentSessionStatus.AUTHORIZED)

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
            expect(newRefunds[0].status).toEqual('REQUESTED')
          })
        })
      })
    })
  },
})

jest.setTimeout(120 * 1000)

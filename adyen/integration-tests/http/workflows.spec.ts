import { Types } from '@adyen/api-library'
import type {
  IPaymentModuleService,
  MedusaContainer,
  PaymentCustomerDTO,
  PaymentDTO,
} from '@medusajs/framework/types'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import { WorkflowManager } from '@medusajs/orchestration'
import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { OrchestrationUtils } from '@medusajs/utils'
import { filter } from 'lodash'
import { processNotificationWorkflow } from '../../src/workflows'
import {
  getAmount,
  getCardDetails,
  getCurrencyCode,
  getCustomer,
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
      let provider_id: string
      let customer: PaymentCustomerDTO
      let encryptedCardDetails: Types.checkout.CardDetails
      let payment: PaymentDTO

      beforeAll(async () => {
        container = getContainer()
        paymentService = container.resolve(Modules.PAYMENT)
        const currency_code = getCurrencyCode()
        const amount = getAmount()
        collectionInput = { amount, currency_code }
        provider_id = getProviderId()
        customer = getCustomer()
        encryptedCardDetails = getCardDetails()
      })

      beforeEach(async () => {
        const collections = await paymentService.createPaymentCollections([
          collectionInput,
        ])
        const collection = collections[0]

        const session = await paymentService.createPaymentSession(
          collection.id,
          {
            amount: collection.amount,
            context: {},
            currency_code: collection.currency_code,
            data: { request: {} },
            provider_id,
          },
        )

        await paymentService.updatePaymentSession({
          amount: collection.amount,
          currency_code: collection.currency_code,
          data: {
            request: {
              paymentMethod: encryptedCardDetails,
            },
          },
          id: session.id,
        })

        await paymentService.authorizePaymentSession(session.id, {})

        const [authorizedPayment] = await paymentService.listPayments(
          {
            payment_session_id: session.id,
          },
          {
            relations: ['payment_session', 'captures', 'refunds'],
          },
        )

        payment = authorizedPayment
        await delay(1000)
      })

      describe('Without Errors', () => {
        describe('Test processing success cancellation notification', () => {
          it('adds a cancellation data event to the data events property and updates the payment with new canceled_at date after a success cancellation notification is processed without prior direct cancellation', async () => {
            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.True,
            )

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newPayment = await paymentService.retrievePayment(payment.id)

            const newCancellations = filter(newPayment.data?.events, {
              name: 'CANCELLATION',
            })

            expect(originalPayment.canceled_at).toBeNull()
            expect(newPayment.canceled_at).toBeDefined()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toBe(pspReference)
            expect(newCancellations[0].merchantReference).toBe(reference)
            expect(newCancellations[0].amount.value).toBe(amount)
            expect(newCancellations[0].amount.currency).toBe(currency)
            expect(newCancellations[0].status).toBe('SUCCEEDED')
          })

          it('updates a cancellation data event after a success cancellation notification is processed with prior direct cancellation', async () => {
            await paymentService.cancelPayment(payment.id)

            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.True,
            )

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newPayment = await paymentService.retrievePayment(payment.id)
            const newCancellations = filter(newPayment.data?.events, {
              name: 'CANCELLATION',
            })

            expect(originalPayment.canceled_at).toBeDefined()
            expect(newPayment.canceled_at).toBeDefined()
            expect(newPayment.canceled_at).toEqual(originalPayment.canceled_at)
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].status).toBe('SUCCEEDED')
          })
        })

        describe('Test processing failed cancellation notification', () => {
          it('adds a cancellation data event to the data events property after a failed cancellation notification is processed without prior direct cancellation', async () => {
            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.False,
            )

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newPayment = await paymentService.retrievePayment(payment.id)
            const newCancellations = filter(newPayment.data?.events, {
              name: 'CANCELLATION',
            })

            expect(originalPayment.canceled_at).toBeNull()
            expect(newPayment.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toBe(pspReference)
            expect(newCancellations[0].merchantReference).toBe(reference)
            expect(newCancellations[0].amount.value).toBe(amount)
            expect(newCancellations[0].amount.currency).toBe(currency)
            expect(newCancellations[0].status).toBe('FAILED')
          })

          it('updates a cancellation data event after a failed cancellation notification is processed with prior direct cancellation', async () => {
            await paymentService.cancelPayment(payment.id)

            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.False,
            )

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const newPayment = await paymentService.retrievePayment(payment.id)
            const newCancellations = filter(newPayment.data?.events, {
              name: 'CANCELLATION',
            })

            expect(originalPayment.canceled_at).toBeDefined()
            expect(newPayment.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(1)
            expect(newCancellations[0].providerReference).toBe(pspReference)
            expect(newCancellations[0].merchantReference).toBe(reference)
            expect(newCancellations[0].amount.value).toBe(amount)
            expect(newCancellations[0].amount.currency).toBe(currency)
            expect(newCancellations[0].status).toBe('FAILED')
          })
        })

        describe('Test processing success capture notification', () => {
          it('adds a payment capture event to the data events property after a success capture notification is processed without prior direct capture', async () => {
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

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )
            const newCaptures = filter(newPayment.data?.events, {
              name: 'CAPTURE',
            })

            expect(newPayment.captures).toHaveLength(1)
            expect(newCaptures).toHaveLength(1)
            expect(newCaptures[0].providerReference).toBe(pspReference)
            expect(newCaptures[0].merchantReference).toBe(reference)
            expect(newCaptures[0].amount.value).toBe(amount)
            expect(newCaptures[0].amount.currency).toBe(currency)
            expect(newCaptures[0].status).toBe('SUCCEEDED')
          })

          it('updates a payment capture event after a success capture notification is processed with prior direct capture', async () => {
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
            await workflow.run({
              input: notification,
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

            expect(originalCaptures).toHaveLength(1)
            expect(newCaptures).toHaveLength(1)
            expect(originalPayment.captures).toHaveLength(1)
            expect(newPayment.captures).toHaveLength(1)
            expect(originalCaptures[0].status).toBe('REQUESTED')
            expect(newCaptures[0].status).toBe('SUCCEEDED')
          })
        })

        describe('Test processing failed capture notification', () => {
          it('preserves the data events property after a failed capture notification is processed without prior direct capture', async () => {
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
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
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

            expect(newPayment.captures).toHaveLength(0)
            expect(newCaptures).toHaveLength(0)
          })

          it('updates a payment capture event after a failed capture notification is processed with prior direct capture', async () => {
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
            await workflow.run({
              input: notification,
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

            expect(originalPayment.captures).toHaveLength(1)
            expect(newPayment.captures).toHaveLength(0)
            expect(originalCaptures).toHaveLength(1)
            expect(newCaptures).toHaveLength(1)
            expect(originalCaptures[0].status).toBe('REQUESTED')
            expect(newCaptures[0].status).toBe('FAILED')
          })
        })

        describe('Test processing success refund notification', () => {
          it('adds a payment refund event to the data events property after a success refund notification is processed without prior direct refund', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

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

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const newRefunds = filter(newPayment.data?.events, {
              name: 'REFUND',
            })

            expect(originalPayment.refunds).toHaveLength(0)
            expect(newPayment.refunds).toHaveLength(1)
            expect(newRefunds).toHaveLength(1)
            expect(newRefunds[0].providerReference).toBe(pspReference)
            expect(newRefunds[0].merchantReference).toBe(reference)
            expect(newRefunds[0].amount.value).toBe(amount)
            expect(newRefunds[0].amount.currency).toBe(currency)
            expect(newRefunds[0].status).toBe('SUCCEEDED')
          })

          it('updates a payment refund event after a success refund notification is processed with prior direct refund', async () => {
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
            await workflow.run({
              input: notification,
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

            expect(originalPayment.refunds).toHaveLength(1)
            expect(newPayment.refunds).toHaveLength(1)
            expect(originalRefunds).toHaveLength(1)
            expect(newRefunds).toHaveLength(1)
            expect(originalRefunds[0].status).toBe('REQUESTED')
            expect(newRefunds[0].status).toBe('SUCCEEDED')
          })
        })

        describe('Test processing failed refund notification', () => {
          it('preserves the data events property after a failed refund notification is processed without prior direct refund', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

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

            const newPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )
            const newRefunds = filter(newPayment.data?.events, {
              name: 'REFUND',
            })

            expect(originalPayment.refunds).toHaveLength(0)
            expect(newPayment.refunds).toHaveLength(0)
            expect(newRefunds).toHaveLength(0)
          })

          it('updates a payment refund event after a failed refund notification is processed with prior direct refund', async () => {
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
            await workflow.run({
              input: notification,
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

            expect(originalPayment.refunds).toHaveLength(1)
            expect(newPayment.refunds).toHaveLength(0)
            expect(originalRefunds).toHaveLength(1)
            expect(newRefunds).toHaveLength(1)
            expect(originalRefunds[0].status).toBe('REQUESTED')
            expect(newRefunds[0].status).toBe('FAILED')
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

        describe('Test processing success cancellation notification', () => {
          it('preserves the original data property after a success cancellation notification processing fails without prior direct cancellation', async () => {
            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.True,
            )

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(payment.id)
            const newCancellations = filter(newPayment.data?.events, {
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
            expect(originalPayment.canceled_at).toBeNull()
            expect(newPayment.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(0)
          })

          it('restores initial payment state after a success cancellation notification processing fails with prior direct cancellation', async () => {
            await paymentService.cancelPayment(payment.id)

            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.True,
            )

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(payment.id)
            const newCancellations = filter(newPayment.data?.events, {
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
            expect(originalPayment.canceled_at).toBeDefined()
            expect(newPayment.canceled_at).toBeDefined()
            expect(newPayment.canceled_at).toEqual(originalPayment.canceled_at)
            expect(newCancellations).toHaveLength(0)
          })
        })

        describe('Test processing failed cancellation notification', () => {
          it('preserves the original data property after a failed cancellation notification processing fails without prior direct cancellation', async () => {
            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.False,
            )

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(payment.id)
            const newCancellations = filter(newPayment.data?.events, {
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
            expect(originalPayment.canceled_at).toBeNull()
            expect(newPayment.canceled_at).toBeNull()
            expect(newCancellations).toHaveLength(0)
          })

          it('restores initial payment state after a failed cancellation notification processing fails with prior direct cancellation', async () => {
            await paymentService.cancelPayment(payment.id)

            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

            const notification = getNotificationRequestItem(
              pspReference,
              reference,
              amount,
              currency,
              EventCodeEnum.Cancellation,
              SuccessEnum.False,
            )

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const newPayment = await paymentService.retrievePayment(payment.id)
            const newCancellations = filter(newPayment.data?.events, {
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
            expect(originalPayment.canceled_at).toBeDefined()
            expect(newPayment.canceled_at).toBeDefined()
            expect(newPayment.canceled_at).toEqual(originalPayment.canceled_at)
            expect(newCancellations).toHaveLength(0)
          })
        })

        describe('Test processing success capture notification', () => {
          it('preserves the original data property after a success capture notification processing fails without prior direct capture', async () => {
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

          it('restores initial payment state after a success capture notification processing fails with prior direct capture', async () => {
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
        })

        describe('Test processing failed capture notification', () => {
          it('preserves the original data property after a failed capture notification processing fails without prior direct capture', async () => {
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

          it('restores initial payment state after a failed capture notification processing fails with prior direct capture', async () => {
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

        describe('Test processing success refund notification', () => {
          it('preserves the original data property after a success refund notification processing fails without prior direct refund', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

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

          it('restores initial payment state after a success refund notification processing fails with prior direct refund', async () => {
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
        })

        describe('Test processing failed refund notification', () => {
          it('preserves the original data property after a failed refund notification processing fails without prior direct refund', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const pspReference = 'pspReference'
            const reference = payment.payment_session!.id
            const amount = payment.amount as number
            const currency = payment.currency_code.toUpperCase()

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

          it('restores initial payment state after a failed refund notification processing fails with prior direct refund', async () => {
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

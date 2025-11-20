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
          it('updates the cancellation data property with notification data and the payment with new canceled_at date after a success cancellation notification is processed without prior direct cancellation', async () => {
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
            )
            const updatedCancellation = updatedPayment.data!
              .cancellation as PaymentModification

            expect(originalPayment.canceled_at).toBeNull()
            expect(updatedPayment.canceled_at).toBeDefined()
            expect(updatedCancellation.pspReference).toBe(pspReference)
            expect(updatedCancellation.reference).toBe(reference)
            expect(updatedCancellation.amount.value).toBe(amount)
            expect(updatedCancellation.amount.currency).toBe(currency)
            expect(updatedCancellation.status).toBe('success')
          })

          it('updates the cancellation data property with notification data after a success cancellation notification is processed with prior direct cancellation', async () => {
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
            )
            const updatedCancellation = updatedPayment.data!
              .cancellation as PaymentModification

            expect(originalPayment.canceled_at).toBeDefined()
            expect(updatedPayment.canceled_at).toBeDefined()
            expect(updatedPayment.canceled_at).toEqual(
              originalPayment.canceled_at,
            )
            expect(updatedCancellation.status).toBe('success')
          })
        })

        describe('Test processing failed cancellation notification', () => {
          it('updates the cancellation data property with notification data after a failed cancellation notification is processed without prior direct cancellation', async () => {
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
            )
            const updatedCancellation = updatedPayment.data!
              .cancellation as PaymentModification

            expect(originalPayment.canceled_at).toBeNull()
            expect(updatedPayment.canceled_at).toBeNull()
            expect(updatedCancellation).not.toBeDefined()
          })

          it('updates the cancellation data property with notification data after a success cancellation notification is processed with prior direct cancellation', async () => {
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
            )
            const updatedCancellation = updatedPayment.data!
              .cancellation as PaymentModification

            expect(originalPayment.canceled_at).toBeDefined()
            expect(updatedPayment.canceled_at).toBeNull()
            expect(updatedCancellation).not.toBeDefined()
          })
        })

        describe('Test processing success capture notification', () => {
          it('adds a payment capture in the captures data property with success status after a success capture notification is processed without prior direct capture', async () => {
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )
            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]
            const lastUpdatedCapture = updatedCaptures[0]

            expect(updatedPayment.captures).toHaveLength(1)
            expect(updatedCaptures).toHaveLength(1)
            expect(lastUpdatedCapture.pspReference).toBe(pspReference)
            expect(lastUpdatedCapture.reference).toBe(reference)
            expect(lastUpdatedCapture.amount.value).toBe(amount)
            expect(lastUpdatedCapture.amount.currency).toBe(currency)
            expect(lastUpdatedCapture.status).toBe('success')
          })

          it('updates a payment capture in the captures data property with success status after a success capture notification is processed with prior direct capture', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
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
            await workflow.run({
              input: notification,
            })

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )
            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]
            const updatedCapture = updatedCaptures[0]

            expect(originalCaptures).toHaveLength(1)
            expect(updatedCaptures).toHaveLength(1)
            expect(originalPayment.captures).toHaveLength(1)
            expect(updatedPayment.captures).toHaveLength(1)
            expect(originalCapture.status).toBe('received')
            expect(updatedCapture.status).toBe('success')
          })
        })

        describe('Test processing failed capture notification', () => {
          it('preserves the captures data property after a failed capture notification is processed without prior direct capture', async () => {
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )
            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]

            expect(updatedPayment.captures).toHaveLength(0)
            expect(updatedCaptures).toHaveLength(0)
          })

          it('removes a payment capture from the captures data property after a failed capture notification is processed with prior direct capture', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
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
              SuccessEnum.False,
            )
            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )

            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]

            expect(originalCaptures).toHaveLength(1)
            expect(updatedCaptures).toHaveLength(0)
            expect(originalPayment.captures).toHaveLength(1)
            expect(updatedPayment.captures).toHaveLength(0)
          })
        })

        describe('Test processing success refund notification', () => {
          it('adds a payment refund in the refunds data property with success status after a success refund notification is processed without prior direct refund', async () => {
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )
            const updatedRefunds = updatedPayment.data!
              .refunds as PaymentModification[]
            const lastUpdatedRefund = updatedRefunds[0]

            expect(originalPayment.refunds).toHaveLength(0)
            expect(updatedPayment.refunds).toHaveLength(1)
            expect(updatedRefunds).toHaveLength(1)
            expect(lastUpdatedRefund.pspReference).toBe(pspReference)
            expect(lastUpdatedRefund.reference).toBe(reference)
            expect(lastUpdatedRefund.amount.value).toBe(amount)
            expect(lastUpdatedRefund.amount.currency).toBe(currency)
            expect(lastUpdatedRefund.status).toBe('success')
          })

          it('updates a payment refund in the refunds data property with success status after a success refund notification is processed with prior direct refund', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })
            await paymentService.refundPayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const originalRefunds = originalPayment.data!
              .refunds as PaymentModification[]
            const originalRefund = originalRefunds[0]

            const notification = getNotificationRequestItem(
              originalRefund.pspReference,
              originalRefund.reference,
              originalRefund.amount.value,
              originalRefund.amount.currency,
              EventCodeEnum.Refund,
              SuccessEnum.True,
            )
            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )
            const updatedRefunds = updatedPayment.data!
              .refunds as PaymentModification[]
            const updatedRefund = updatedRefunds[0]

            expect(originalRefunds).toHaveLength(1)
            expect(updatedRefunds).toHaveLength(1)
            expect(originalPayment.refunds).toHaveLength(1)
            expect(updatedPayment.refunds).toHaveLength(1)
            expect(originalRefund.status).toBe('received')
            expect(updatedRefund.status).toBe('success')
          })
        })

        describe('Test processing failed refund notification', () => {
          it('preserves the refunds data property after a failed refund notification is processed without prior direct refund', async () => {
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )
            const updatedRefunds = updatedPayment.data!
              .refunds as PaymentModification[]

            expect(originalPayment.refunds).toHaveLength(0)
            expect(updatedPayment.refunds).toHaveLength(0)
            expect(updatedRefunds).toHaveLength(0)
          })

          it('removes a payment refund from the refunds data property after a failed refund notification is processed with prior direct refund', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })
            await paymentService.refundPayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const originalRefunds = originalPayment.data!
              .refunds as PaymentModification[]
            const originalRefund = originalRefunds[0]

            const notification = getNotificationRequestItem(
              originalRefund.pspReference,
              originalRefund.reference,
              originalRefund.amount.value,
              originalRefund.amount.currency,
              EventCodeEnum.Refund,
              SuccessEnum.False,
            )
            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
            })

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const updatedRefunds = updatedPayment.data!
              .refunds as PaymentModification[]

            expect(originalRefunds).toHaveLength(1)
            expect(updatedRefunds).toHaveLength(0)
            expect(originalPayment.refunds).toHaveLength(1)
            expect(updatedPayment.refunds).toHaveLength(0)
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
            )
            const updatedCancellation = updatedPayment.data!
              .cancellation as PaymentModification

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
            expect(updatedPayment.canceled_at).toBeNull()
            expect(updatedCancellation).not.toBeDefined()
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
            )
            const updatedCancellation = updatedPayment.data!
              .cancellation as PaymentModification

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
            expect(updatedPayment.canceled_at).toBeDefined()
            expect(updatedPayment.canceled_at).toEqual(
              originalPayment.canceled_at,
            )
            expect(updatedCancellation).not.toBeDefined()
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
            )
            const updatedCancellation = updatedPayment.data!
              .cancellation as PaymentModification

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
            expect(updatedPayment.canceled_at).toBeNull()
            expect(updatedCancellation).not.toBeDefined()
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
            )
            const updatedCancellation = updatedPayment.data!
              .cancellation as PaymentModification

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
            expect(updatedPayment.canceled_at).toBeDefined()
            expect(updatedPayment.canceled_at).toEqual(
              originalPayment.canceled_at,
            )
            expect(updatedCancellation).not.toBeDefined()
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )

            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]

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
            expect(updatedPayment.captures).toHaveLength(0)
            expect(updatedCaptures).toHaveLength(0)
          })

          it('restores initial payment state after a success capture notification processing fails with prior direct capture', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
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
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )
            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]
            const updatedCapture = updatedCaptures[0]

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
            expect(updatedPayment.captures).toHaveLength(1)
            expect(originalCaptures).toHaveLength(1)
            expect(updatedCaptures).toHaveLength(1)
            expect(originalCapture.status).toBe('received')
            expect(updatedCapture.status).toBe('received')
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )

            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]

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
            expect(updatedPayment.captures).toHaveLength(0)
            expect(updatedCaptures).toHaveLength(0)
          })

          it('restores initial payment state after a failed capture notification processing fails with prior direct capture', async () => {
            await paymentService.capturePayment({ payment_id: payment.id })

            const originalPayment = await paymentService.retrievePayment(
              payment.id,
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
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['captures'],
              },
            )
            const updatedCaptures = updatedPayment.data!
              .captures as PaymentModification[]
            const updatedCapture = updatedCaptures[0]

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
            expect(updatedPayment.captures).toHaveLength(1)
            expect(originalCaptures).toHaveLength(1)
            expect(updatedCaptures).toHaveLength(1)
            expect(originalCapture.status).toBe('received')
            expect(updatedCapture.status).toBe('received')
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const updatedRefunds = updatedPayment.data!
              .refunds as PaymentModification[]

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
            expect(updatedPayment.refunds).toHaveLength(0)
            expect(updatedRefunds).toHaveLength(0)
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

            const originalRefunds = originalPayment.data!
              .refunds as PaymentModification[]
            const originalRefund = originalRefunds[0]

            const notification = getNotificationRequestItem(
              originalRefund.pspReference,
              originalRefund.reference,
              originalRefund.amount.value,
              originalRefund.amount.currency,
              EventCodeEnum.Refund,
              SuccessEnum.True,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )
            const updatedRefunds = updatedPayment.data!
              .refunds as PaymentModification[]
            const updatedRefund = updatedRefunds[0]

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
            expect(updatedPayment.refunds).toHaveLength(1)
            expect(originalRefunds).toHaveLength(1)
            expect(updatedRefunds).toHaveLength(1)
            expect(originalRefund.status).toBe('received')
            expect(updatedRefund.status).toBe('received')
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

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )

            const updatedRefunds = updatedPayment.data!
              .refunds as PaymentModification[]

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
            expect(updatedPayment.refunds).toHaveLength(0)
            expect(updatedRefunds).toHaveLength(0)
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

            const originalRefunds = originalPayment.data!
              .refunds as PaymentModification[]
            const originalRefund = originalRefunds[0]

            const notification = getNotificationRequestItem(
              originalRefund.pspReference,
              originalRefund.reference,
              originalRefund.amount.value,
              originalRefund.amount.currency,
              EventCodeEnum.Refund,
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
              input: notification,
              throwOnError: false,
            })

            const updatedPayment = await paymentService.retrievePayment(
              payment.id,
              {
                relations: ['refunds'],
              },
            )
            const updatedRefunds = updatedPayment.data!
              .refunds as PaymentModification[]
            const updatedRefund = updatedRefunds[0]

            console.log(
              'originalPayment',
              JSON.stringify(originalPayment, null, 2),
            )
            console.log(
              'updatedPayment',
              JSON.stringify(updatedPayment, null, 2),
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
            expect(originalPayment.refunds).toHaveLength(1)
            expect(updatedPayment.refunds).toHaveLength(1)
            expect(originalRefunds).toHaveLength(1)
            expect(updatedRefunds).toHaveLength(1)
            expect(originalRefund.status).toBe('received')
            expect(updatedRefund.status).toBe('received')
          })
        })
      })
    })
  },
})

jest.setTimeout(120 * 1000)

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

      xdescribe('Test processing success capture notification', () => {
        describe('Invocation', () => {
          let payment: PaymentDTO

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
                relations: ['payment_session', 'captures'],
              },
            )

            payment = authorizedPayment
            await delay(1000)
          })

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
            await workflow.run({
              input: notification,
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

            expect(originalCaptures).toHaveLength(1)
            expect(updatedCaptures).toHaveLength(1)
            expect(originalPayment.captures).toHaveLength(1)
            expect(updatedPayment.captures).toHaveLength(1)
            expect(originalCapture.status).toBe('received')
            expect(updatedCapture.status).toBe('success')
          })
        })

        describe('Compensation', () => {
          let payment: PaymentDTO
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
                  input?.__type ===
                  OrchestrationUtils.SymbolWorkflowWorkflowData
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
                relations: ['payment_session', 'captures'],
              },
            )

            payment = authorizedPayment
            await delay(1000)
          })

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
            const { errors } = await workflow.run({
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
      })

      describe('Test processing failed capture notification', () => {
        describe('Invocation', () => {
          let payment: PaymentDTO

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
                relations: ['payment_session', 'captures'],
              },
            )

            payment = authorizedPayment
            await delay(1000)
          })

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

            expect(updatedPayment.captures).toHaveLength(0)
            expect(updatedCaptures).toHaveLength(0)
          })

          it('removes a payment capture from the captures data property after a failed capture notification is processed with prior direct capture', async () => {
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
              SuccessEnum.False,
            )
            const workflow = processNotificationWorkflow(container)
            await workflow.run({
              input: notification,
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

            expect(originalCaptures).toHaveLength(1)
            expect(updatedCaptures).toHaveLength(0)
            expect(originalPayment.captures).toHaveLength(1)
            expect(updatedPayment.captures).toHaveLength(0)
          })
        })

        describe('Compensation', () => {
          let payment: PaymentDTO
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
                  input?.__type ===
                  OrchestrationUtils.SymbolWorkflowWorkflowData
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
                relations: ['payment_session', 'captures'],
              },
            )

            payment = authorizedPayment
            await delay(1000)
          })

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

          fit('restores initial payment state after a failed capture notification processing fails with prior direct capture', async () => {
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
              SuccessEnum.False,
            )

            const workflow = processNotificationWorkflow(container)
            const { errors } = await workflow.run({
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
            expect(originalPayment.captures).toHaveLength(0)
            expect(updatedPayment.captures).toHaveLength(0)
            expect(originalCaptures).toHaveLength(0)
            expect(updatedCaptures).toHaveLength(0)
            expect(originalCapture.status).toBe('received')
            expect(updatedCapture.status).toBe('received')
          })
        })
      })
    })
  },
})

jest.setTimeout(120 * 1000)

import { PaymentDTO } from '@medusajs/framework/types'
import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
  when,
} from '@medusajs/framework/workflows-sdk'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'
import processCaptureWorkflow from './process-capture'
import {
  NotificationRequestItem,
  NotificationWorkflowInput,
  isCapture,
} from './utils'

export const processNotificationWorkflowId = 'process-notification-workflow'

const getFirstPayment = (payments: PaymentDTO[]): PaymentDTO => payments[0]

const mergeNotificationIntoPaymentData = (
  input: NotificationWorkflowInput,
): PaymentDTO => {
  const { notification, payment } = input
  const { data } = payment
  const notifications = (data?.notifications as NotificationRequestItem[]) || []
  const newData = { ...data, notifications: [...notifications, notification] }
  return { ...payment, data: newData }
}

const processNotificationWorkflowFunction = (
  notification: WorkflowData<NotificationRequestItem>,
): WorkflowResponse<unknown, any[]> => {
  const { data: payments } = useQueryGraphStep({
    entity: 'payment',
    fields: ['id', 'data', 'captures.*'],
    filters: { payment_session_id: notification.merchantReference },
  }).config({
    name: 'payments',
  })

  const payment = transform(payments, getFirstPayment)

  const newPayment = transform(
    { notification, payment } as NotificationWorkflowInput,
    mergeNotificationIntoPaymentData,
  )

  when('is-capture', notification, isCapture).then(() => {
    return processCaptureWorkflow.runAsStep({
      input: { notification, payment: newPayment },
    })
  })
  return new WorkflowResponse(undefined, undefined)
}

const processNotificationWorkflow = createWorkflow(
  processNotificationWorkflowId,
  processNotificationWorkflowFunction,
)

export default processNotificationWorkflow

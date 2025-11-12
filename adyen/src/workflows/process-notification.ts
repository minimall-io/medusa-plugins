import { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import {
  createHook,
  createWorkflow,
  type Hook,
  transform,
  type WorkflowData,
  WorkflowResponse,
  when,
} from '@medusajs/framework/workflows-sdk'

import { processCaptureSuccessStep } from './steps'

type NotificationRequestItem = Types.notification.NotificationRequestItem
const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

type Hooks = [
  Hook<'validateNotification', WorkflowData<NotificationRequestItem>, unknown>,
  Hook<'notificationProcessed', WorkflowData<WorkflowOutput>, unknown>,
]

interface TransformInput {
  notification: NotificationRequestItem
  captureSuccess: WorkflowData<PaymentDTO> | undefined
}

export interface WorkflowOutput {
  notification: NotificationRequestItem
  payment: WorkflowData<PaymentDTO> | undefined
}

export const processNotificationWorkflowId = 'process-notification-workflow'

const isCaptureSuccess = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  eventCode === EventCodeEnum.Capture && success === SuccessEnum.True

const isCatureNotSuccess = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  eventCode === EventCodeEnum.Capture && success === SuccessEnum.False

export const processNotificationWorkflow = createWorkflow(
  processNotificationWorkflowId,
  (input: WorkflowData<NotificationRequestItem>) => {
    const validateNotification = createHook('validateNotification', input)

    const captureSuccess = when(
      'capture-success',
      input,
      isCaptureSuccess,
    ).then(() => {
      return processCaptureSuccessStep(input)
    })

    const results = transform<TransformInput, WorkflowOutput>(
      { notification: input, captureSuccess },
      (data) => {
        const { notification, captureSuccess } = data
        const payment = captureSuccess! // TODO expand this this expression to include other notification types.
        return { notification, payment }
      },
    )

    const notificationProcessed = createHook('notificationProcessed', results)

    return new WorkflowResponse<WorkflowOutput, Hooks>(results, {
      hooks: [validateNotification, notificationProcessed],
    })
  },
)

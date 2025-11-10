import { Types } from '@adyen/api-library'
import { PaymentDTO } from '@medusajs/framework/types'
import {
  Hook,
  WorkflowData,
  WorkflowResponse,
  createHook,
  createWorkflow,
  transform,
  when,
} from '@medusajs/framework/workflows-sdk'

import { processCaptureSuccessStep } from './steps'

type NotificationRequestItem = Types.notification.NotificationRequestItem
const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

type Hooks = [
  Hook<'validateNotification', WorkflowData<NotificationRequestItem>, unknown>,
  Hook<'notificationProcessed', WorkflowData<ConsolidatedData>, unknown>,
]

export interface ConsolidatedData {
  notification: NotificationRequestItem
  captureSuccess: WorkflowData<PaymentDTO> | undefined
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

    const results = transform<ConsolidatedData, ConsolidatedData>(
      { notification: input, captureSuccess },
      (data) => ({ ...data }),
    )

    const notificationProcessed = createHook('notificationProcessed', results)

    return new WorkflowResponse<ConsolidatedData, Hooks>(results, {
      hooks: [validateNotification, notificationProcessed],
    })
  },
)

import { Types } from '@adyen/api-library'
import {
  WorkflowResponse,
  createWorkflow,
  when,
} from '@medusajs/framework/workflows-sdk'

import { errorTestStep, processCaptureSuccessStep } from './steps'

type NotificationRequestItem = Types.notification.NotificationRequestItem
const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

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

const processNotificationWorkflowFunction = (
  input: NotificationRequestItem,
): WorkflowResponse<unknown, any[]> => {
  when('is-capture-success', input, isCaptureSuccess).then(() => {
    processCaptureSuccessStep(input)
    errorTestStep()
  })

  return new WorkflowResponse(undefined)
}

const processNotificationWorkflow = createWorkflow(
  processNotificationWorkflowId,
  processNotificationWorkflowFunction,
)

export default processNotificationWorkflow

import { Types } from '@adyen/api-library'
import {
  createHook,
  createWorkflow,
  type Hook,
  type WorkflowData,
  WorkflowResponse,
  when,
} from '@medusajs/framework/workflows-sdk'

import {
  cancellationFailureStep,
  cancellationSuccessStep,
  captureFailureStep,
  captureSuccessStep,
  refundFailureStep,
  refundSuccessStep,
} from './steps'

type NotificationRequestItem = Types.notification.NotificationRequestItem
const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

type Hooks = [
  Hook<'validateNotification', WorkflowData<NotificationRequestItem>, unknown>,
  Hook<'notificationProcessed', WorkflowData<NotificationRequestItem>, unknown>,
]

export const processNotificationWorkflowId = 'process-notification-workflow'

const isAuthorizationSuccess = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  eventCode === EventCodeEnum.Authorisation && success === SuccessEnum.True

const isAuthorizationFailed = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  eventCode === EventCodeEnum.Authorisation && success === SuccessEnum.False

const isCancellationSuccess = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  (eventCode === EventCodeEnum.Cancellation ||
    eventCode === EventCodeEnum.TechnicalCancel) &&
  success === SuccessEnum.True

const isCancellationFailed = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  (eventCode === EventCodeEnum.Cancellation ||
    eventCode === EventCodeEnum.TechnicalCancel) &&
  success === SuccessEnum.False

const isCaptureSuccess = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  eventCode === EventCodeEnum.Capture && success === SuccessEnum.True

const isCatureFailed = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  (eventCode === EventCodeEnum.Capture && success === SuccessEnum.False) ||
  (eventCode === EventCodeEnum.CaptureFailed && success === SuccessEnum.True)

const isRefundSuccess = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  eventCode === EventCodeEnum.Refund && success === SuccessEnum.True

const isRefundFailed = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  (eventCode === EventCodeEnum.Refund && success === SuccessEnum.False) ||
  (eventCode === EventCodeEnum.RefundFailed && success === SuccessEnum.True) ||
  (eventCode === EventCodeEnum.RefundedReversed && success === SuccessEnum.True)

export const processNotificationWorkflow = createWorkflow(
  processNotificationWorkflowId,
  (input: WorkflowData<NotificationRequestItem>) => {
    const validateNotification = createHook('validateNotification', input)

    when('cancellation-success', input, isCancellationSuccess).then(() => {
      cancellationSuccessStep(input)
    })

    when('cancellation-failure', input, isCancellationFailed).then(() => {
      cancellationFailureStep(input)
    })

    when('capture-success', input, isCaptureSuccess).then(() => {
      captureSuccessStep(input)
    })

    when('capture-failure', input, isCatureFailed).then(() => {
      captureFailureStep(input)
    })

    when('refund-success', input, isRefundSuccess).then(() => {
      refundSuccessStep(input)
    })

    when('refund-failure', input, isRefundFailed).then(() => {
      refundFailureStep(input)
    })

    const notificationProcessed = createHook('notificationProcessed', input)

    return new WorkflowResponse<NotificationRequestItem, Hooks>(input, {
      hooks: [validateNotification, notificationProcessed],
    })
  },
)

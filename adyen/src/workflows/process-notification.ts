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
  authorisationFailedStep,
  authorisationSuccessStep,
  cancellationFailedStep,
  cancellationSuccessStep,
  captureFailedStep,
  captureSuccessStep,
  refundFailedStep,
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

const isAuthorisationSuccess = ({
  eventCode,
  success,
}: NotificationRequestItem): boolean =>
  eventCode === EventCodeEnum.Authorisation && success === SuccessEnum.True

const isAuthorisationFailed = ({
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

    when('authorisation-success', input, isAuthorisationSuccess).then(() => {
      authorisationSuccessStep(input)
    })

    when('authorisation-failed', input, isAuthorisationFailed).then(() => {
      authorisationFailedStep(input)
    })

    when('cancellation-success', input, isCancellationSuccess).then(() => {
      cancellationSuccessStep(input)
    })

    when('cancellation-failed', input, isCancellationFailed).then(() => {
      cancellationFailedStep(input)
    })

    when('capture-success', input, isCaptureSuccess).then(() => {
      captureSuccessStep(input)
    })

    when('capture-failed', input, isCatureFailed).then(() => {
      captureFailedStep(input)
    })

    when('refund-success', input, isRefundSuccess).then(() => {
      refundSuccessStep(input)
    })

    when('refund-failed', input, isRefundFailed).then(() => {
      refundFailedStep(input)
    })

    const notificationProcessed = createHook('notificationProcessed', input)

    return new WorkflowResponse<NotificationRequestItem, Hooks>(input, {
      hooks: [validateNotification, notificationProcessed],
    })
  },
)

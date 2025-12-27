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
  getPaymentDataStep,
  type PaymentData,
  refundFailedStep,
  refundSuccessStep,
  synchronizePaymentCollectionStep,
  synchronizePaymentSessionStep,
} from './steps'

type NotificationRequestItem = Types.notification.NotificationRequestItem
const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

type ProcessNotificationWorkflowHooks = [
  Hook<'notificationProcessed', WorkflowData<PaymentData>, unknown>,
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
  (notification: WorkflowData<NotificationRequestItem>) => {
    const paymentData = getPaymentDataStep(notification)

    when('authorisation-success', notification, isAuthorisationSuccess).then(
      () => {
        authorisationSuccessStep(paymentData)
      },
    )

    when('authorisation-failed', notification, isAuthorisationFailed).then(
      () => {
        authorisationFailedStep(paymentData)
      },
    )

    when('cancellation-success', notification, isCancellationSuccess).then(
      () => {
        cancellationSuccessStep(paymentData)
      },
    )

    when('cancellation-failed', notification, isCancellationFailed).then(() => {
      cancellationFailedStep(paymentData)
    })

    when('capture-success', notification, isCaptureSuccess).then(() => {
      captureSuccessStep(paymentData)
    })

    when('capture-failed', notification, isCatureFailed).then(() => {
      captureFailedStep(paymentData)
    })

    when('refund-success', notification, isRefundSuccess).then(() => {
      refundSuccessStep(paymentData)
    })

    when('refund-failed', notification, isRefundFailed).then(() => {
      refundFailedStep(paymentData)
    })

    synchronizePaymentSessionStep(paymentData)
    synchronizePaymentCollectionStep(paymentData)

    const notificationProcessed = createHook(
      'notificationProcessed',
      paymentData,
    )

    return new WorkflowResponse<
      NotificationRequestItem,
      ProcessNotificationWorkflowHooks
    >(notification, {
      hooks: [notificationProcessed],
    })
  },
)

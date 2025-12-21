import { Types } from '@adyen/api-library'
import { useQueryGraphStep } from '@medusajs/core-flows'
import type { PaymentCollectionDTO } from '@medusajs/framework/types'
import {
  createHook,
  createWorkflow,
  type Hook,
  transform,
  type WorkflowData,
  WorkflowResponse,
  when,
} from '@medusajs/framework/workflows-sdk'
import { find } from 'lodash'
import {
  authorisationFailedStep,
  authorisationSuccessStep,
  cancellationFailedStep,
  cancellationSuccessStep,
  captureFailedStep,
  captureSuccessStep,
  type NotificationStepInput,
  refundFailedStep,
  refundSuccessStep,
  synchronizePaymentCollectionStep,
  synchronizePaymentSessionStep,
} from './steps'

type NotificationRequestItem = Types.notification.NotificationRequestItem
const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

interface TransformInput {
  notification: NotificationRequestItem
  paymentCollections: PaymentCollectionDTO[]
}

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

const getStepInput = (data: TransformInput): NotificationStepInput => {
  const { paymentCollections, notification } = data
  const collection = paymentCollections[0]
  const session = find(collection.payment_sessions, {
    id: notification.merchantReference,
  })
  const payment = session?.payment
  const captures = payment?.captures
  const refunds = payment?.refunds
  return { captures, collection, notification, payment, refunds, session }
}

export const processNotificationWorkflow = createWorkflow(
  processNotificationWorkflowId,
  (notification: WorkflowData<NotificationRequestItem>) => {
    const validateNotification = createHook(
      'validateNotification',
      notification,
    )

    const { data: paymentCollections } = useQueryGraphStep({
      entity: 'payment_collection',
      fields: [
        '*',
        'payment_sessions.*',
        'payment_sessions.payment.*',
        'payment_sessions.payment.captures.*',
        'payment_sessions.payment.refunds.*',
      ],
      filters: {
        id: notification.merchantReference,
      },
    })

    const input = transform<TransformInput, NotificationStepInput>(
      { notification, paymentCollections },
      getStepInput,
    )

    when('authorisation-success', notification, isAuthorisationSuccess).then(
      () => {
        authorisationSuccessStep(input)
      },
    )

    when('authorisation-failed', notification, isAuthorisationFailed).then(
      () => {
        authorisationFailedStep(input)
      },
    )

    when('cancellation-success', notification, isCancellationSuccess).then(
      () => {
        cancellationSuccessStep(input)
      },
    )

    when('cancellation-failed', notification, isCancellationFailed).then(() => {
      cancellationFailedStep(input)
    })

    when('capture-success', notification, isCaptureSuccess).then(() => {
      captureSuccessStep(input)
    })

    when('capture-failed', notification, isCatureFailed).then(() => {
      captureFailedStep(input)
    })

    when('refund-success', notification, isRefundSuccess).then(() => {
      refundSuccessStep(input)
    })

    when('refund-failed', notification, isRefundFailed).then(() => {
      refundFailedStep(input)
    })

    synchronizePaymentSessionStep(input)
    synchronizePaymentCollectionStep(input)

    const notificationProcessed = createHook(
      'notificationProcessed',
      notification,
    )

    return new WorkflowResponse<NotificationRequestItem, Hooks>(notification, {
      hooks: [validateNotification, notificationProcessed],
    })
  },
)

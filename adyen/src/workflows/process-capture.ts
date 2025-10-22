import {
  createWorkflow,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk'

import {
  Data,
  isFailed,
  isSuccess,
  NotificationWorkflowInput,
  PaymentCaptureResponse,
  PaymentDTO,
  SuccessEnum,
} from './utils'

import { updatePaymentStep } from './steps'

export const processCaptureWorkflowId = 'process-capture-workflow'

const processPaymentCaptureResponses = (
  input: NotificationWorkflowInput,
): Data | null => {
  const { notification, payment } = input
  const { pspReference, success } = notification
  const { data } = payment

  const responses =
    (data?.paymentCaptureResponses as PaymentCaptureResponse[]) || []

  const otherResponses = responses.filter(
    (response) => response.pspReference !== pspReference,
  )
  const response = responses.find(
    (response) => response.pspReference === pspReference,
  )

  if (!response) return null

  const status = success === SuccessEnum.True ? 'success' : 'failed'
  const paymentCaptureResponses = [...otherResponses, { ...response, status }]
  return { ...data, paymentCaptureResponses } as Data
}

const processSuccessfulCapture = (
  input: NotificationWorkflowInput,
): PaymentDTO | null => {
  const data = processPaymentCaptureResponses(input)

  if (!data) return null
  return { ...input.payment, data } as PaymentDTO
}

const isSuccessWithPayment = ({
  payment,
  notification,
}: NotificationWorkflowInput): boolean =>
  isSuccess(notification) && payment !== null

const isSuccessWithoutPayment = ({
  payment,
  notification,
}: NotificationWorkflowInput): boolean =>
  isSuccess(notification) && payment === null

const isFailedWithPayment = ({
  payment,
  notification,
}: NotificationWorkflowInput): boolean =>
  isFailed(notification) && payment !== null

const isFailedWithoutPayment = ({
  payment,
  notification,
}: NotificationWorkflowInput): boolean =>
  isFailed(notification) && payment === null

const processCaptureWorkflowFunction = (
  input: WorkflowData<NotificationWorkflowInput>,
): WorkflowResponse<unknown, any[]> => {
  const payment = transform(input, processSuccessfulCapture)

  when('is-successful-capture-with-payment', input, isSuccessWithPayment).then(
    () => {
      return updatePaymentStep(payment)
    },
  )

  when(
    'is-successful-capture-without-payment',
    input,
    isSuccessWithoutPayment,
  ).then(() => {
    return new WorkflowResponse(undefined, undefined)
  })

  when('is-failed-capture-with-payment', input, isFailedWithPayment).then(
    () => {
      return new WorkflowResponse(undefined, undefined)
    },
  )

  when('is-failed-capture-without-payment', input, isFailedWithoutPayment).then(
    () => {
      return new WorkflowResponse(undefined, undefined)
    },
  )

  return new WorkflowResponse(undefined, undefined)
}

const processCaptureWorkflow = createWorkflow(
  processCaptureWorkflowId,
  processCaptureWorkflowFunction,
)

export default processCaptureWorkflow

import { Types } from '@adyen/api-library'
import { PaymentDTO } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import {
  StepExecutionContext,
  StepResponse,
  createStep,
} from '@medusajs/framework/workflows-sdk'

import { getAmountFromMinorUnit } from '../../utils'

const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum
type NotificationRequestItem = Types.notification.NotificationRequestItem
type PaymentCaptureResponse = Types.checkout.PaymentCaptureResponse
type PaymentCaptureResponses = Record<string, PaymentCaptureResponse>

export const processCaptureSuccessStepId = 'process-capture-success-step'

const processCaptureSuccess = (
  notification: NotificationRequestItem,
  payment: PaymentDTO,
): PaymentDTO => {
  const { pspReference, success } = notification
  const { data } = payment
  const status = success === SuccessEnum.True ? 'success' : 'failed'

  const responses =
    (data?.paymentCaptureResponses as PaymentCaptureResponses) || {}

  const response = responses[pspReference]

  if (response) {
    const paymentCaptureResponses = {
      ...responses,
      [pspReference]: { ...response, status },
    }
    const newData = { ...data, paymentCaptureResponses } as PaymentDTO['data']
    return { id: payment.id, data: newData } as PaymentDTO
  }

  const paymentCaptureRequests = { [pspReference]: { ...notification, status } }
  const newData = { ...data, paymentCaptureRequests } as PaymentDTO['data']
  return { id: payment.id, data: newData } as PaymentDTO
}

const processCaptureSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { merchantReference, amount } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const [originalPayment] = await paymentService.listPayments({
    payment_session_id: merchantReference,
  })

  const newPayment = processCaptureSuccess(notification, originalPayment)
  const updatedPayment = await paymentService.updatePayment(newPayment)

  if (
    updatedPayment.data?.paymentCaptureRequests &&
    amount?.value &&
    amount?.currency
  ) {
    const capture = {
      payment_id: updatedPayment.id,
      amount: getAmountFromMinorUnit(amount.value, amount.currency),
      captured_by: notification.merchantAccountCode,
    }
    const capturedPayment = await paymentService.capturePayment(capture)
    return new StepResponse<PaymentDTO, PaymentDTO>(
      capturedPayment,
      originalPayment,
    )
  }

  return new StepResponse<PaymentDTO, PaymentDTO>(
    updatedPayment,
    originalPayment,
  )
}

const processCaptureSuccessStepCompensate = async (
  originalPayment: PaymentDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const updatedPayment = await paymentService.updatePayment(originalPayment)
  return new StepResponse<PaymentDTO>(updatedPayment)
}

const processCaptureSuccessStep = createStep(
  processCaptureSuccessStepId,
  processCaptureSuccessStepInvoke,
  processCaptureSuccessStepCompensate,
)

export default processCaptureSuccessStep

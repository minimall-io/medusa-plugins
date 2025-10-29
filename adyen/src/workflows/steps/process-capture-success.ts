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
  const { pspReference, success, merchantReference } = notification
  const { data } = payment
  const status = success === SuccessEnum.True ? 'success' : 'failed'

  const responses = (data?.captures as PaymentCaptureResponses) || {}
  const response = responses[pspReference]

  if (response) {
    const captures = {
      ...responses,
      [pspReference]: { ...response, status },
    }
    const newData = { ...data, captures } as PaymentDTO['data']
    return { id: payment.id, data: newData } as PaymentDTO
  }

  const request = { ...notification, status, reference: merchantReference }
  const newData = { ...data, request } as PaymentDTO['data']
  return { id: payment.id, data: newData } as PaymentDTO
}

const processCaptureSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { merchantReference, amount } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const [originalPayment] = await paymentService.listPayments(
    {
      payment_session_id: merchantReference,
    },
    {
      relations: ['captures'],
    },
  )

  console.log(
    'processCaptureSuccessStepInvoke/originalPayment',
    JSON.stringify(originalPayment, null, 2),
  )

  const processedPayment = processCaptureSuccess(notification, originalPayment)

  console.log(
    'processCaptureSuccessStepInvoke/processedPayment',
    JSON.stringify(processedPayment, null, 2),
  )

  const updatedPayment = await paymentService.updatePayment(processedPayment)

  if (updatedPayment.data?.captures && amount?.value && amount?.currency) {
    const capture = {
      payment_id: updatedPayment.id,
      amount: getAmountFromMinorUnit(amount.value, amount.currency),
      captured_by: notification.merchantAccountCode,
    }
    await paymentService.capturePayment(capture)
  }

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
  })

  console.log(
    'processCaptureSuccessStepInvoke/newPayment',
    JSON.stringify(newPayment, null, 2),
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const processCaptureSuccessStepCompensate = async (
  originalPayment: PaymentDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
  })
  const originalCaptures = originalPayment.captures || []
  const newCaptures = newPayment.captures || []
  const originalCaptureIds = new Set(
    originalCaptures.map<string>((capture) => capture.id),
  )
  const newCaptureIds = newCaptures.map<string>((capture) => capture.id)
  const capturesToDelete = newCaptureIds.filter(
    (id) => !originalCaptureIds.has(id),
  )
  console.log(
    'processCaptureSuccessStepInvoke/originalPayment',
    JSON.stringify(originalPayment, null, 2),
  )
  console.log(
    'processCaptureSuccessStepInvoke/newPayment',
    JSON.stringify(newPayment, null, 2),
  )
  console.log(
    'processCaptureSuccessStepInvoke/capturesToDelete',
    JSON.stringify(capturesToDelete, null, 2),
  )
  await paymentService.deleteCaptures(capturesToDelete)
  const updatedPayment = await paymentService.updatePayment(originalPayment)
  console.log(
    'processCaptureSuccessStepInvoke/updatedPayment',
    JSON.stringify(updatedPayment, null, 2),
  )
  return new StepResponse<PaymentDTO>(updatedPayment)
}

const processCaptureSuccessStep = createStep(
  processCaptureSuccessStepId,
  processCaptureSuccessStepInvoke,
  processCaptureSuccessStepCompensate,
)

export default processCaptureSuccessStep

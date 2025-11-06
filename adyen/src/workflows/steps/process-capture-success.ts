import { Types } from '@adyen/api-library'
import { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import {
  StepExecutionContext,
  StepResponse,
  createStep,
} from '@medusajs/framework/workflows-sdk'

import { getWholeUnit } from '../../utils'

const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum
type NotificationRequestItem = Types.notification.NotificationRequestItem
type PaymentCaptureResponse = Types.checkout.PaymentCaptureResponse
type PaymentCaptureResponses = PaymentCaptureResponse[]
interface CompensateInput {
  notification: NotificationRequestItem
  payment: PaymentDTO
}

export const processCaptureSuccessStepId = 'process-capture-success-step'

const generateNewDataPayment = (
  notification: NotificationRequestItem,
  payment: PaymentDTO,
): PaymentDTO => {
  const { pspReference, success, merchantReference } = notification
  const { data } = payment
  const status = success === SuccessEnum.True ? 'success' : 'failed'

  const captures = (data?.captures as PaymentCaptureResponses) || []
  const captureToUpdate = captures.find(
    (capture) => capture.pspReference === pspReference,
  )

  if (captureToUpdate) {
    const otherCaptures = captures.filter(
      (capture) => capture.pspReference !== pspReference,
    )
    const newCaptures = [...otherCaptures, { ...captureToUpdate, status }]
    const newData = { ...data, captures: newCaptures } as PaymentDTO['data']
    return { id: payment.id, data: newData } as PaymentDTO
  }

  const message = { ...notification, status, reference: merchantReference }
  const newData = { ...data, message } as PaymentDTO['data']
  return { id: payment.id, data: newData } as PaymentDTO
}

const restoreOriginalDataPayment = (
  notification: NotificationRequestItem,
  payment: PaymentDTO,
): PaymentDTO => {
  const { pspReference } = notification
  const { data } = payment

  const captures = (data?.captures as PaymentCaptureResponses) || []
  const otherCaptures = captures.filter(
    (capture) => capture.pspReference !== pspReference,
  )
  const notificationCapture = captures.find(
    (capture) => capture.pspReference === pspReference,
  )

  if (notificationCapture) {
    const newCaptures = [...captures]
    const newData = { ...data, captures: newCaptures } as PaymentDTO['data']
    return { ...payment, data: newData } as PaymentDTO
  }

  const newCaptures = [...otherCaptures]
  const newData = { ...data, captures: newCaptures } as PaymentDTO['data']
  return { ...payment, data: newData } as PaymentDTO
}

const generateCapturesToDelete = (
  originalPayment: PaymentDTO,
  newPayment: PaymentDTO,
): string[] => {
  const originalCaptures = originalPayment.captures || []
  const newCaptures = newPayment.captures || []
  const originalCaptureIds = new Set(
    originalCaptures.map<string>((capture) => capture.id),
  )
  const newCaptureIds = newCaptures.map<string>((capture) => capture.id)
  return newCaptureIds.filter((id) => !originalCaptureIds.has(id))
}

const processCaptureSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, CompensateInput>> => {
  const { merchantReference, amount, merchantAccountCode } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const [originalPayment] = await paymentService.listPayments(
    {
      payment_session_id: merchantReference,
    },
    {
      relations: ['captures'],
    },
  )
  const processedPayment = generateNewDataPayment(notification, originalPayment)
  const updatedPayment = await paymentService.updatePayment(processedPayment)

  if (updatedPayment.data?.message && amount?.value && amount?.currency) {
    const capture = {
      payment_id: updatedPayment.id,
      amount: getWholeUnit(amount.value, amount.currency),
      captured_by: merchantAccountCode,
    }
    await paymentService.capturePayment(capture)
  }

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
  })

  logging.debug(
    `processCaptureSuccessStepInvoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )
  logging.debug(
    `processCaptureSuccessStepInvoke/processedPayment ${JSON.stringify(processedPayment, null, 2)}`,
  )
  logging.debug(
    `processCaptureSuccessStepInvoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, CompensateInput>(newPayment, {
    notification,
    payment: originalPayment,
  })
}

const processCaptureSuccessStepCompensate = async (
  { notification, payment }: CompensateInput,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const newPayment = await paymentService.retrievePayment(payment.id, {
    relations: ['captures'],
  })
  const capturesToDelete = generateCapturesToDelete(payment, newPayment)
  await paymentService.deleteCaptures(capturesToDelete)
  const processedPayment = restoreOriginalDataPayment(notification, payment)
  const updatedPayment = await paymentService.updatePayment(processedPayment)

  logging.debug(
    `processCaptureSuccessStepCompensate/payment ${JSON.stringify(payment, null, 2)}`,
  )
  logging.debug(
    `processCaptureSuccessStepCompensate/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )
  logging.debug(
    `processCaptureSuccessStepCompensate/capturesToDelete ${JSON.stringify(capturesToDelete, null, 2)}`,
  )
  logging.debug(
    `processCaptureSuccessStepCompensate/updatedPayment ${JSON.stringify(updatedPayment, null, 2)}`,
  )
  return new StepResponse<PaymentDTO>(updatedPayment)
}

const processCaptureSuccessStep = createStep(
  processCaptureSuccessStepId,
  processCaptureSuccessStepInvoke,
  processCaptureSuccessStepCompensate,
)

export default processCaptureSuccessStep

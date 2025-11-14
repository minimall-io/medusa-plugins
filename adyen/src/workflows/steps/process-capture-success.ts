import { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'

import { getWholeUnit } from '../../utils'

const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum
type NotificationRequestItem = Types.notification.NotificationRequestItem
type PaymentCaptureResponse = Types.checkout.PaymentCaptureResponse
type PaymentCaptureResponses = PaymentCaptureResponse[]

export const processCaptureSuccessStepId = 'process-capture-success-step'

const generateNewDataPayment = (
  notification: NotificationRequestItem,
  payment: PaymentDTO,
): PaymentDTO => {
  const {
    pspReference,
    success,
    merchantReference: reference,
    amount,
  } = notification
  const { data, id } = payment
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
    return { data: newData, id } as PaymentDTO
  }

  const captureToAdd = { amount, pspReference, reference, status }
  const newData = { ...data, message: captureToAdd } as PaymentDTO['data']
  return { data: newData, id } as PaymentDTO
}

const restoreOriginalDataPayment = (payment: PaymentDTO): PaymentDTO => {
  const { data, id } = payment
  const captures = (data?.captures as PaymentCaptureResponses) || []
  const newCaptures = [...captures]
  const newData = { ...data, captures: newCaptures } as PaymentDTO['data']
  return { data: newData, id } as PaymentDTO
}

const generateCapturesToDelete = (
  oldPayment: PaymentDTO,
  newPayment: PaymentDTO,
): string[] => {
  const oldCaptures = oldPayment.captures || []
  const newCaptures = newPayment.captures || []
  const oldCaptureIds = oldCaptures.map<string>((capture) => capture.id)
  const oldCaptureIdsSet = new Set(oldCaptureIds)
  const newCaptureIds = newCaptures.map<string>((capture) => capture.id)
  return newCaptureIds.filter((id) => !oldCaptureIdsSet.has(id))
}

const processCaptureSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
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
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const processedPayment = generateNewDataPayment(notification, originalPayment)
  const updatedPayment = await paymentService.updatePayment(processedPayment)

  if (updatedPayment.data?.message && amount?.value && amount?.currency) {
    const capture = {
      amount: getWholeUnit(amount.value, amount.currency),
      captured_by: merchantAccountCode,
      payment_id: updatedPayment.id,
    }
    await paymentService.capturePayment(capture)
  }

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
  })
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const processCaptureSuccessStepCompensate = async (
  payment: PaymentDTO,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const newPayment = await paymentService.retrievePayment(payment.id, {
    relations: ['captures'],
  })
  logging.debug(
    `${workflowId}/${stepName}/compensate/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  const capturesToDelete = generateCapturesToDelete(payment, newPayment)
  logging.debug(
    `${workflowId}/${stepName}/compensate/capturesToDelete ${JSON.stringify(capturesToDelete, null, 2)}`,
  )

  await paymentService.deleteCaptures(capturesToDelete)
  const processedPayment = restoreOriginalDataPayment(payment)
  await paymentService.updatePayment(processedPayment)

  const restoredPayment = await paymentService.retrievePayment(payment.id, {
    relations: ['captures'],
  })
  logging.debug(
    `${workflowId}/${stepName}/compensate/restoredPayment ${JSON.stringify(restoredPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO>(restoredPayment)
}

const processCaptureSuccessStep = createStep(
  processCaptureSuccessStepId,
  processCaptureSuccessStepInvoke,
  processCaptureSuccessStepCompensate,
)

export default processCaptureSuccessStep

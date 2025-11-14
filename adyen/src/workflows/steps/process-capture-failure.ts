import type { Types } from '@adyen/api-library'
import type { CaptureDTO, PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'

import type { PaymentModification } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem
type PaymentModifications = PaymentModification[]

export const processCaptureFailureStepId = 'process-capture-failure-step'

const getCaptureIdToDelete = (
  notification: NotificationRequestItem,
  payment: PaymentDTO,
): string | undefined => {
  const { pspReference } = notification
  const { data } = payment
  const captures = (data?.captures as PaymentModifications) || []
  const captureToDelete = captures.find(
    (capture) => capture.pspReference === pspReference,
  )
  return captureToDelete?.id
}

const generateNewDataPayment = (
  notification: NotificationRequestItem,
  payment: PaymentDTO,
): PaymentDTO => {
  const { pspReference } = notification
  const { data, id } = payment
  const captures = (data?.captures as PaymentModifications) || []
  const newCaptures = captures.filter(
    (capture) => capture.pspReference !== pspReference,
  )
  const newData = { ...data, captures: newCaptures } as PaymentDTO['data']
  return { data: newData, id } as PaymentDTO
}

const restoreOriginalDataPayment = (payment: PaymentDTO): PaymentDTO => {
  const { data, id } = payment
  const captures = (data?.captures as PaymentModifications) || []
  const newCaptures = [...captures]
  const newData = { ...data, captures: newCaptures } as PaymentDTO['data']
  return { data: newData, id } as PaymentDTO
}

const generateCapturesToRestore = (
  oldPayment: PaymentDTO,
  newPayment: PaymentDTO,
): CaptureDTO[] => {
  const oldCaptures = oldPayment.captures || []
  const newCaptures = newPayment.captures || []
  const newCaptureIds = newCaptures.map<string>((capture) => capture.id)
  const newCaptureIdsSet = new Set(newCaptureIds)
  return oldCaptures.filter((capture) => !newCaptureIdsSet.has(capture.id))
}

const processCaptureFailureStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { merchantReference } = notification
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
  const captureIdToDelete = getCaptureIdToDelete(notification, originalPayment)
  await paymentService.updatePayment(processedPayment)
  if (captureIdToDelete) {
    await paymentService.deleteCaptures([captureIdToDelete])
  }

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
  })
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const processCaptureFailureStepCompensate = async (
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

  const capturesToRestore = generateCapturesToRestore(payment, newPayment)
  logging.debug(
    `${workflowId}/${stepName}/compensate/capturesToRestore ${JSON.stringify(capturesToRestore, null, 2)}`,
  )

  const promises = capturesToRestore.map((capture) =>
    paymentService.capturePayment({
      amount: capture.amount,
      captured_by: capture.created_by,
      payment_id: payment.id,
    }),
  )
  await Promise.all(promises)
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

const processCaptureFailureStep = createStep(
  processCaptureFailureStepId,
  processCaptureFailureStepInvoke,
  processCaptureFailureStepCompensate,
)

export default processCaptureFailureStep

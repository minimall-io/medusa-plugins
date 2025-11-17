import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy, find } from 'lodash'

import { managePaymentData, type PaymentModification } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const processCaptureFailureStepId = 'process-capture-failure-step'

const processCaptureFailureStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { merchantReference, pspReference } = notification
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

  const { getCapture, deleteCapture } = managePaymentData(originalPayment.data)

  const dataCapture = getCapture(pspReference)
  const paymentToUpdate = {
    captured_at: undefined,
    data: deleteCapture(pspReference),
    id: originalPayment.id,
  } as PaymentDTO
  await paymentService.updatePayment(paymentToUpdate)
  if (dataCapture?.id) {
    await paymentService.deleteCaptures([dataCapture.id])
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
  originalPayment: PaymentDTO,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
  })
  logging.debug(
    `${workflowId}/${stepName}/compensate/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  const {
    listCaptures: originalListCaptures,
    updateData,
    updateCapture,
  } = managePaymentData(originalPayment.data)
  const { listCaptures: newListCaptures } = managePaymentData(newPayment.data)

  const [dataCapture]: PaymentModification[] = differenceBy(
    originalListCaptures(),
    newListCaptures(),
    'id',
  )
  if (dataCapture) {
    const originalPaymentCapture = find(originalPayment.captures, {
      id: dataCapture.id,
    })
    const webhookPayment = {
      data: updateData({ webhook: true }),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(webhookPayment)
    const paymentCaptureToCreate = {
      amount: originalPaymentCapture.amount,
      captured_by: originalPaymentCapture.created_by,
      payment_id: originalPayment.id,
    }
    await paymentService.capturePayment(paymentCaptureToCreate)
    const restoredPaymentCaptures = await paymentService.listCaptures({
      payment_id: originalPayment.id,
    })
    const [restoredPaymentCapture] = differenceBy(
      restoredPaymentCaptures,
      newPayment.captures,
      'id',
    )
    const dataCaptureToAdd = { ...dataCapture, id: restoredPaymentCapture.id }
    const paymentToUpdate = {
      data: updateCapture(dataCaptureToAdd),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate)
  }

  const restoredPayment = await paymentService.retrievePayment(
    originalPayment.id,
    {
      relations: ['captures'],
    },
  )
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

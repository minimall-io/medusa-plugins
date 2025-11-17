import { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy, map } from 'lodash'

import { getWholeUnit, managePaymentData } from '../../utils'

const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum
type NotificationRequestItem = Types.notification.NotificationRequestItem

export const captureSuccessStepId = 'capture-success-step'

const captureSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const {
    merchantReference: reference,
    amount,
    merchantAccountCode,
    pspReference,
    success,
  } = notification
  const status = success === SuccessEnum.True ? 'success' : 'failed'
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const [originalPayment] = await paymentService.listPayments(
    {
      payment_session_id: reference,
    },
    {
      relations: ['captures'],
    },
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const { getCapture, updateCapture, updateData } = managePaymentData(
    originalPayment.data,
  )

  const dataCapture = getCapture(pspReference)

  if (dataCapture) {
    const paymentToUpdate = {
      data: updateCapture({ ...dataCapture, status }),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate)
  } else if (amount.value !== undefined && amount.currency !== undefined) {
    const webhookPayment = {
      data: updateData({ webhook: true }),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(webhookPayment)
    const paymentCaptureToCreate = {
      amount: getWholeUnit(amount.value, amount.currency),
      captured_by: merchantAccountCode,
      payment_id: originalPayment.id,
    }
    await paymentService.capturePayment(paymentCaptureToCreate)
    const newPaymentCaptures = await paymentService.listCaptures({
      payment_id: originalPayment.id,
    })
    const [newPaymentCapture] = differenceBy(
      newPaymentCaptures,
      originalPayment.captures,
      'id',
    )
    const newDataCapture = {
      amount: { currency: amount.currency, value: amount.value },
      id: newPaymentCapture.id,
      pspReference,
      reference,
      status,
    }
    const paymentToUpdate = {
      data: updateCapture(newDataCapture),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate)
  }

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
  })
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const captureSuccessStepCompensate = async (
  originalPayment: PaymentDTO,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const { listCaptures } = managePaymentData(originalPayment.data)

  const newPaymentCaptures = await paymentService.listCaptures({
    payment_id: originalPayment.id,
  })
  logging.debug(
    `${workflowId}/${stepName}/compensate/newPaymentCaptures ${JSON.stringify(newPaymentCaptures, null, 2)}`,
  )

  const paymentCapturesToDelete = map(
    differenceBy(newPaymentCaptures, originalPayment.captures, 'id'),
    'id',
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/paymentCapturesToDelete ${JSON.stringify(paymentCapturesToDelete, null, 2)}`,
  )

  await paymentService.deleteCaptures(paymentCapturesToDelete)
  const dataToUpdate = {
    ...originalPayment.data,
    captures: listCaptures(),
  } as PaymentDTO['data']
  const paymentToUpdate = {
    data: dataToUpdate,
    id: originalPayment.id,
  } as PaymentDTO
  await paymentService.updatePayment(paymentToUpdate)

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

const captureSuccessStep = createStep(
  captureSuccessStepId,
  captureSuccessStepInvoke,
  captureSuccessStepCompensate,
)

export default captureSuccessStep

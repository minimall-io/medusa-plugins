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

  const captureToUpdate = getCapture(pspReference)

  if (captureToUpdate) {
    const newData = updateCapture({ ...captureToUpdate, status })
    const newPayment = {
      data: newData,
      id: originalPayment.id,
    }
    await paymentService.updatePayment(newPayment)
  } else if (amount.value !== undefined && amount.currency !== undefined) {
    const webhookData = updateData({ webhook: true })
    const webhookPayment = {
      data: webhookData,
      id: originalPayment.id,
    }
    await paymentService.updatePayment(webhookPayment)
    const capture = {
      amount: getWholeUnit(amount.value, amount.currency),
      captured_by: merchantAccountCode,
      payment_id: originalPayment.id,
    }
    await paymentService.capturePayment(capture)
    const updatedCaptures = await paymentService.listCaptures({
      payment_id: originalPayment.id,
    })
    const newCaptures = differenceBy(
      updatedCaptures,
      originalPayment.captures,
      'id',
    )
    const newCapture = newCaptures[0]
    const captureToAdd = {
      amount: { currency: amount.currency, value: amount.value },
      id: newCapture.id,
      pspReference,
      reference,
      status,
    }
    const newData = updateCapture(captureToAdd)
    const newPayment = {
      data: newData,
      id: originalPayment.id,
    }
    await paymentService.updatePayment(newPayment)
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
  payment: PaymentDTO,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const { data, id, captures } = payment

  const { listCaptures } = managePaymentData(data)

  const newCaptures = await paymentService.listCaptures({
    payment_id: id,
  })
  logging.debug(
    `${workflowId}/${stepName}/compensate/newCaptures ${JSON.stringify(newCaptures, null, 2)}`,
  )

  const capturesToDelete = map(differenceBy(newCaptures, captures, 'id'), 'id')
  logging.debug(
    `${workflowId}/${stepName}/compensate/capturesToDelete ${JSON.stringify(capturesToDelete, null, 2)}`,
  )

  await paymentService.deleteCaptures(capturesToDelete)
  const newData = { ...data, captures: listCaptures() } as PaymentDTO['data']
  const processedPayment = { data: newData, id } as PaymentDTO
  await paymentService.updatePayment(processedPayment)

  const restoredPayment = await paymentService.retrievePayment(payment.id, {
    relations: ['captures'],
  })
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

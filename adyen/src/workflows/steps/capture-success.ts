import type { Types } from '@adyen/api-library'
import type { CaptureDTO, PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy, map } from 'lodash'
import { getWholeUnit, PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const captureSuccessStepId = 'capture-success-step'

const captureSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const {
    merchantReference,
    amount: { value, currency },
    pspReference: providerReference,
    eventDate: date,
    merchantAccountCode,
  } = notification
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

  const dataManager = PaymentDataManager(originalPayment.data)

  const dataCapture = dataManager.getEvent(providerReference)

  if (dataCapture) {
    dataManager.setEvent({ ...dataCapture, date, status: 'SUCCEEDED' })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate)
  } else if (value !== undefined && currency !== undefined) {
    dataManager.setData({ webhook: true })
    const webhookPayment = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(webhookPayment)
    const paymentCaptureToCreate = {
      amount: getWholeUnit(value, currency),
      captured_by: merchantAccountCode,
      payment_id: originalPayment.id,
    }
    await paymentService.capturePayment(paymentCaptureToCreate)
    const newPaymentCaptures = await paymentService.listCaptures({
      payment_id: originalPayment.id,
    })
    const [newPaymentCapture]: CaptureDTO[] = differenceBy(
      newPaymentCaptures,
      originalPayment.captures,
      'id',
    )
    dataManager.setEvent({
      amount: { currency, value },
      date,
      id: newPaymentCapture.id,
      merchantReference,
      name: 'CAPTURE',
      providerReference,
      status: 'SUCCEEDED',
    })
    dataManager.setData({ webhook: false })

    const paymentToUpdate = {
      data: dataManager.getData(),
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

  const dataManager = PaymentDataManager(originalPayment.data)

  const newPaymentCaptures = await paymentService.listCaptures({
    payment_id: originalPayment.id,
  })
  const paymentCapturesToDelete: string[] = map(
    differenceBy(newPaymentCaptures, originalPayment.captures, 'id'),
    'id',
  )

  await paymentService.deleteCaptures(paymentCapturesToDelete)
  const paymentToUpdate = {
    captured_at: originalPayment.captured_at,
    data: dataManager.getData(),
    id: originalPayment.id,
  }
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

import type { Types } from '@adyen/api-library'
import type { CaptureDTO, PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy } from 'lodash'
import { PaymentDataManager } from '../../utils'
import { maybeUpdatePaymentCollection } from './helpers'

type NotificationRequestItem = Types.notification.NotificationRequestItem

interface CaptureFailedStepCompensateInput {
  originalPayment: PaymentDTO
  notification: NotificationRequestItem
}

export const captureFailedStepId = 'capture-failed-step'

const captureFailedStepInvoke = async (
  notification: NotificationRequestItem,
  stepExecutionContext: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, CaptureFailedStepCompensateInput>> => {
  const { container, workflowId, stepName, context } = stepExecutionContext
  const {
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
    reason: notes,
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
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const dataCapture = dataManager.getEvent(providerReference)

  if (dataCapture) {
    dataManager.setEvent({ ...dataCapture, date, notes, status: 'FAILED' })
  }

  const paymentToUpdate = {
    captured_at: undefined,
    data: dataManager.getData(),
    id: originalPayment.id,
  }
  await paymentService.updatePayment(paymentToUpdate, context)
  if (dataCapture?.id) {
    await paymentService.deleteCaptures([dataCapture.id], context)
  }

  const newPayment = await paymentService.retrievePayment(
    originalPayment.id,
    {
      relations: ['captures'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  await maybeUpdatePaymentCollection(
    originalPayment.payment_collection_id,
    stepExecutionContext,
  )

  return new StepResponse<PaymentDTO, CaptureFailedStepCompensateInput>(
    newPayment,
    { notification, originalPayment },
  )
}

const captureFailedStepCompensate = async (
  { originalPayment, notification }: CaptureFailedStepCompensateInput,
  stepExecutionContext: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const { container, workflowId, stepName, context } = stepExecutionContext
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const newPayment = await paymentService.retrievePayment(
    originalPayment.id,
    {
      relations: ['captures'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const [originalPaymentCapture]: CaptureDTO[] = differenceBy(
    originalPayment.captures,
    newPayment.captures,
    'id',
  )
  if (originalPaymentCapture) {
    dataManager.setData({ webhook: true })
    const webhookPayment = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(webhookPayment, context)
    const paymentCaptureToCreate = {
      amount: originalPaymentCapture.amount,
      captured_by: originalPaymentCapture.created_by,
      payment_id: originalPayment.id,
    }
    await paymentService.capturePayment(paymentCaptureToCreate, context)
    const restoredPaymentCaptures = await paymentService.listCaptures(
      {
        payment_id: originalPayment.id,
      },
      undefined,
      context,
    )
    const [restoredPaymentCapture] = differenceBy(
      restoredPaymentCaptures,
      newPayment.captures,
      'id',
    )
    const dataCapture = dataManager.getEvent(pspReference)
    if (dataCapture) {
      dataManager.setEvent({
        ...dataCapture,
        id: restoredPaymentCapture.id,
      })
    }
    dataManager.setData({ webhook: false })
  }

  const paymentToUpdate = {
    captured_at: originalPayment.captured_at,
    data: dataManager.getData(),
    id: originalPayment.id,
  }
  await paymentService.updatePayment(paymentToUpdate, context)

  const restoredPayment = await paymentService.retrievePayment(
    originalPayment.id,
    {
      relations: ['captures'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/restoredPayment ${JSON.stringify(restoredPayment, null, 2)}`,
  )

  await maybeUpdatePaymentCollection(
    originalPayment.payment_collection_id,
    stepExecutionContext,
  )

  return new StepResponse<PaymentDTO>(restoredPayment)
}

const captureFailedStep = createStep(
  captureFailedStepId,
  captureFailedStepInvoke,
  captureFailedStepCompensate,
)

export default captureFailedStep

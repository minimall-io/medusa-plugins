import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy, find } from 'lodash'
import { type Event, PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const captureFailureStepId = 'capture-failure-step'

const captureFailureStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const {
    merchantReference,
    amount: { value, currency },
    pspReference: providerReference,
    eventDate: date,
  } = notification
  const status = 'failed'
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

  if (value !== undefined && currency !== undefined) {
    dataManager.setEvent({
      amount: { currency, value },
      date,
      id: dataCapture?.id,
      merchantReference,
      name: 'CAPTURE',
      providerReference,
      status,
    })
  }

  const paymentToUpdate = {
    captured_at: undefined,
    data: dataManager.getData(),
    id: originalPayment.id,
  }
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

const captureFailureStepCompensate = async (
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

  const originalDataManager = PaymentDataManager(originalPayment.data)
  const newDataManager = PaymentDataManager(newPayment.data)

  const [dataCapture]: Event[] = differenceBy(
    originalDataManager.getCaptures(),
    newDataManager.getCaptures(),
    'id',
  )
  if (dataCapture) {
    const originalPaymentCapture = find(originalPayment.captures, {
      id: dataCapture.id,
    })
    originalDataManager.setData({ webhook: true })
    const webhookPayment = {
      data: originalDataManager.getData(),
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
    originalDataManager.setData({ webhook: false })
    originalDataManager.setEvent({
      ...dataCapture,
      id: restoredPaymentCapture.id,
    })

    const paymentToUpdate = {
      captured_at: originalPayment.captured_at,
      data: originalDataManager.getData(),
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

const captureFailureStep = createStep(
  captureFailureStepId,
  captureFailureStepInvoke,
  captureFailureStepCompensate,
)

export default captureFailureStep

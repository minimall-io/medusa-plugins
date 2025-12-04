import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { find } from 'lodash'
import { PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

interface CaptureFailedStepCompensateInput {
  originalPayment: PaymentDTO
  notification: NotificationRequestItem
}

export const captureFailedStepId = 'capture-failed-step'

const captureFailedStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, CaptureFailedStepCompensateInput>> => {
  const {
    amount: { currency, value },
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
    reason: message,
  } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (value === undefined || currency === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      'Capture notification is missing amount information!',
    )
  }

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

  if (!dataManager.isAuthorised()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Payment not authorised!',
    )
  }

  const originalDataCapture = dataManager.getEvent(providerReference)

  if (originalDataCapture?.id) {
    await paymentService.deleteCaptures([originalDataCapture.id], context)
  }

  dataManager.setEvent({
    amount: { currency, value },
    date,
    id: originalDataCapture?.id ?? 'MISSING',
    merchantReference,
    message,
    name: 'CAPTURE',
    providerReference,
    status: 'FAILED',
  })

  const paymentToUpdate = {
    captured_at: undefined,
    data: dataManager.getData(),
    id: originalPayment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

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

  return new StepResponse<PaymentDTO, CaptureFailedStepCompensateInput>(
    newPayment,
    { notification, originalPayment },
  )
}

const captureFailedStepCompensate = async (
  { originalPayment, notification }: CaptureFailedStepCompensateInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)
  const originalDataCapture = dataManager.getEvent(pspReference)
  const originalPaymentCapture = find(
    originalPayment.captures,
    (capture) => capture.id === originalDataCapture?.id,
  )

  if (originalPaymentCapture) {
    dataManager.setData({ webhook: originalDataCapture })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
    const paymentCaptureToCreate = {
      amount: originalPaymentCapture.amount,
      captured_by: originalPaymentCapture.created_by,
      payment_id: originalPayment.id,
    }
    await paymentService.capturePayment(paymentCaptureToCreate, context)
  } else {
    const paymentToUpdate = {
      captured_at: originalPayment.captured_at,
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
  }

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

  return new StepResponse<PaymentDTO>(restoredPayment)
}

const captureFailedStep = createStep(
  captureFailedStepId,
  captureFailedStepInvoke,
  captureFailedStepCompensate,
)

export default captureFailedStep

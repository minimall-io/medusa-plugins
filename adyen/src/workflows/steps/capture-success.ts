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
import { getWholeUnit, PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

interface CaptureSuccessStepCompensateInput {
  originalPayment: PaymentDTO
  notification: NotificationRequestItem
}

export const captureSuccessStepId = 'capture-success-step'

const captureSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, CaptureSuccessStepCompensateInput>> => {
  const {
    amount: { value, currency },
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
    merchantAccountCode,
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

  if (originalDataCapture && originalDataCapture.id !== 'MISSING') {
    dataManager.setEvent({
      amount: { currency, value },
      date,
      id: originalDataCapture.id,
      merchantReference,
      name: 'CAPTURE',
      providerReference,
      status: 'SUCCEEDED',
    })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
  } else {
    dataManager.setData({
      webhook: {
        amount: { currency, value },
        date,
        id: 'MISSING',
        merchantReference,
        name: 'CAPTURE',
        providerReference,
        status: 'SUCCEEDED',
      },
    })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
    const paymentCaptureToCreate = {
      amount: getWholeUnit(value, currency),
      captured_by: merchantAccountCode,
      payment_id: originalPayment.id,
    }
    await paymentService.capturePayment(paymentCaptureToCreate, context)
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

  return new StepResponse<PaymentDTO, CaptureSuccessStepCompensateInput>(
    newPayment,
    { notification, originalPayment },
  )
}

const captureSuccessStepCompensate = async (
  { originalPayment, notification }: CaptureSuccessStepCompensateInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
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

  const originalDataManager = PaymentDataManager(originalPayment.data)
  const newDataManager = PaymentDataManager(newPayment.data)
  const originalDataCapture = originalDataManager.getEvent(pspReference)
  const newDataCapture = newDataManager.getEvent(pspReference)

  if (
    (!originalDataCapture || originalDataCapture.id === 'MISSING') &&
    newDataCapture &&
    newDataCapture.id !== 'MISSING'
  ) {
    await paymentService.deleteCaptures([newDataCapture.id], context)
  }
  const paymentToUpdate = {
    captured_at: originalPayment.captured_at,
    data: originalDataManager.getData(),
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

  return new StepResponse<PaymentDTO>(restoredPayment)
}

const captureSuccessStep = createStep(
  captureSuccessStepId,
  captureSuccessStepInvoke,
  captureSuccessStepCompensate,
)

export default captureSuccessStep

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
import type { PaymentData } from './types'

export const captureSuccessStepId = 'capture-success-step'

const captureSuccessStepInvoke = async (
  input: PaymentData,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined, PaymentData>> => {
  const { notification, payment } = input
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

  logging.debug(
    `${workflowId}/${stepName}/invoke/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(payment.data)

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
      id: payment.id,
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
      id: payment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
    const paymentCaptureToCreate = {
      amount: getWholeUnit(value, currency),
      captured_by: merchantAccountCode,
      payment_id: payment.id,
    }
    await paymentService.capturePayment(paymentCaptureToCreate, context)
  }

  return new StepResponse<undefined, PaymentData>(undefined, input)
}

const captureSuccessStepCompensate = async (
  input: PaymentData,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { payment, notification } = input
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const newPayment = await paymentService.retrievePayment(
    payment.id,
    {
      relations: ['captures'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  const originalDataManager = PaymentDataManager(payment.data)
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
    captured_at: payment.captured_at,
    data: originalDataManager.getData(),
    id: payment.id,
  }
  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined>()
}

const captureSuccessStep = createStep(
  captureSuccessStepId,
  captureSuccessStepInvoke,
  captureSuccessStepCompensate,
)

export default captureSuccessStep

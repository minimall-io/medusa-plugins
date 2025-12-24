import { MedusaError, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { find } from 'lodash'
import { PaymentDataManager } from '../../utils'
import type { PaymentData } from './types'

export const captureFailedStepId = 'capture-failed-step'

const captureFailedStepInvoke = async (
  input: PaymentData,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<undefined, PaymentData>> => {
  const { notification, payment } = input
  const {
    amount: { currency, value },
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
    reason: message,
  } = notification
  const paymentService = container.resolve(Modules.PAYMENT)

  if (value === undefined || currency === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      'Capture notification is missing amount information!',
    )
  }

  const dataManager = PaymentDataManager(payment.data)

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
    id: 'MISSING',
    merchantReference,
    message,
    name: 'CAPTURE',
    providerReference,
    status: 'FAILED',
  })

  const paymentToUpdate = {
    captured_at: undefined,
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined, PaymentData>(undefined, input)
}

const captureFailedStepCompensate = async (
  input: PaymentData,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { payment, notification } = input
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)

  const dataManager = PaymentDataManager(payment.data)
  const originalDataCapture = dataManager.getEvent(pspReference)
  const originalPaymentCapture = find(
    payment.captures,
    (capture) => capture.id === originalDataCapture?.id,
  )

  if (originalPaymentCapture) {
    dataManager.setData({ webhook: originalDataCapture })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: payment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
    const paymentCaptureToCreate = {
      amount: originalPaymentCapture.amount,
      captured_by: originalPaymentCapture.created_by,
      payment_id: payment.id,
    }
    await paymentService.capturePayment(paymentCaptureToCreate, context)
  } else {
    const paymentToUpdate = {
      captured_at: payment.captured_at,
      data: dataManager.getData(),
      id: payment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
  }

  return new StepResponse<undefined>()
}

const captureFailedStep = createStep(
  captureFailedStepId,
  captureFailedStepInvoke,
  captureFailedStepCompensate,
)

export default captureFailedStep

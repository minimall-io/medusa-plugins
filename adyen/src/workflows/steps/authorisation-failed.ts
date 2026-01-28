import { MedusaError, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { PaymentDataManager } from '../../utils'
import type { PaymentData } from './types'

export const authorisationFailedStepId = 'authorisation-failed-step'

const authorisationFailedStepInvoke = async (
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
      'Authorisation notification is missing amount information!',
    )
  }

  const dataManager = PaymentDataManager(payment.data)

  dataManager.setAuthorisation({
    amount: { currency, value },
    date,
    id: merchantReference,
    merchantReference,
    message,
    name: 'AUTHORISATION',
    providerReference,
    status: 'FAILED',
  })

  const paymentToUpdate = {
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined, PaymentData>(undefined, input)
}

const authorisationFailedStepCompensate = async (
  input: PaymentData,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { payment } = input
  const paymentService = container.resolve(Modules.PAYMENT)

  const dataManager = PaymentDataManager(payment.data)

  const paymentToUpdate = {
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined>()
}

const authorisationFailedStep = createStep(
  authorisationFailedStepId,
  authorisationFailedStepInvoke,
  authorisationFailedStepCompensate,
)

export default authorisationFailedStep

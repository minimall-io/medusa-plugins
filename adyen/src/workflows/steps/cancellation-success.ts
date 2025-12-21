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
import { PaymentDataManager } from '../../utils'
import type { PaymentData } from './types'

export const cancellationSuccessStepId = 'cancellation-success-step'

const cancellationSuccessStepInvoke = async (
  input: PaymentData,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined, PaymentData>> => {
  const { notification, payment } = input
  const {
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
  } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

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

  const authorisation = dataManager.getAuthorisation()

  const amount = authorisation!.amount

  dataManager.setEvent({
    amount,
    date,
    id: merchantReference,
    merchantReference,
    name: 'CANCELLATION',
    providerReference,
    status: 'SUCCEEDED',
  })

  const paymentToUpdate = {
    canceled_at: payment.canceled_at ?? date,
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined, PaymentData>(undefined, input)
}

const cancellationSuccessStepCompensate = async (
  input: PaymentData,
  stepExecutionContext: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { payment } = input
  const { container, workflowId, stepName, context } = stepExecutionContext
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(payment.data)

  const paymentToUpdate = {
    canceled_at: payment.canceled_at,
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined>()
}

const cancellationSuccessStep = createStep(
  cancellationSuccessStepId,
  cancellationSuccessStepInvoke,
  cancellationSuccessStepCompensate,
)

export default cancellationSuccessStep

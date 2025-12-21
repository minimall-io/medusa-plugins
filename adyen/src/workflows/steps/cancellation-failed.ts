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
import type { NotificationStepInput } from './types'

export const cancellationFailedStepId = 'cancellation-failed-step'

const cancellationFailedStepInvoke = async (
  input: NotificationStepInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined, NotificationStepInput>> => {
  const { notification, payment } = input
  const {
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
    reason: message,
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
    message,
    name: 'CANCELLATION',
    providerReference,
    status: 'FAILED',
  })

  const paymentToUpdate = {
    canceled_at: undefined,
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined, NotificationStepInput>(undefined, input)
}

const cancellationFailedStepCompensate = async (
  input: NotificationStepInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { payment } = input
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

const cancellationFailedStep = createStep(
  cancellationFailedStepId,
  cancellationFailedStepInvoke,
  cancellationFailedStepCompensate,
)

export default cancellationFailedStep

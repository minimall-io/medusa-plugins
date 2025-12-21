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

export const authorisationSuccessStepId = 'authorisation-success-step'

const authorisationSuccessStepInvoke = async (
  input: NotificationStepInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined, NotificationStepInput>> => {
  const { notification, payment } = input
  const {
    amount: { currency, value },
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
  } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (value === undefined || currency === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      'Authorisation notification is missing amount information!',
    )
  }

  logging.debug(
    `${workflowId}/${stepName}/invoke/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(payment.data)

  dataManager.setAuthorisation({
    amount: { currency, value },
    date,
    id: merchantReference,
    merchantReference,
    name: 'AUTHORISATION',
    providerReference,
    status: 'SUCCEEDED',
  })

  const paymentToUpdate = {
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined, NotificationStepInput>(undefined, input)
}

const authorisationSuccessStepCompensate = async (
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
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined>()
}

const authorisationSuccessStep = createStep(
  authorisationSuccessStepId,
  authorisationSuccessStepInvoke,
  authorisationSuccessStepCompensate,
)

export default authorisationSuccessStep

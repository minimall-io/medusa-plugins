import type { Types } from '@adyen/api-library'
import type { PaymentSessionDTO } from '@medusajs/framework/types'
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PaymentSessionStatus,
} from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const authorisationFailedStepId = 'authorisation-failed-step'

const authorisationFailedStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentSessionDTO, PaymentSessionDTO>> => {
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
      'Authorisation notification is missing amount information!',
    )
  }

  const originalPaymentSession = await paymentService.retrievePaymentSession(
    merchantReference,
    {
      relations: ['payment'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPaymentSession ${JSON.stringify(originalPaymentSession, null, 2)}`,
  )

  const originalPayment = originalPaymentSession.payment!

  const dataManager = PaymentDataManager(originalPayment.data)

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
    id: originalPayment.id,
  }

  const paymentSessionToUpdate = {
    ...originalPaymentSession,
    status: PaymentSessionStatus.ERROR,
  }

  await paymentService.updatePayment(paymentToUpdate, context)
  await paymentService.updatePaymentSession(paymentSessionToUpdate, context)

  const newPaymentSession = await paymentService.retrievePaymentSession(
    originalPaymentSession.id,
    {
      relations: ['payment'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPaymentSession ${JSON.stringify(newPaymentSession, null, 2)}`,
  )

  return new StepResponse<PaymentSessionDTO, PaymentSessionDTO>(
    newPaymentSession,
    originalPaymentSession,
  )
}

const authorisationFailedStepCompensate = async (
  originalPaymentSession: PaymentSessionDTO,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentSessionDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPaymentSession ${JSON.stringify(originalPaymentSession, null, 2)}`,
  )

  const originalPayment = originalPaymentSession.payment!

  const dataManager = PaymentDataManager(originalPayment.data)

  const paymentToUpdate = {
    data: dataManager.getData(),
    id: originalPayment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)
  await paymentService.updatePaymentSession(originalPaymentSession, context)

  const restoredPaymentSession = await paymentService.retrievePaymentSession(
    originalPaymentSession.id,
    {
      relations: ['payment'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/restoredPaymentSession ${JSON.stringify(restoredPaymentSession, null, 2)}`,
  )

  return new StepResponse<PaymentSessionDTO>(restoredPaymentSession)
}

const authorisationFailedStep = createStep(
  authorisationFailedStepId,
  authorisationFailedStepInvoke,
  authorisationFailedStepCompensate,
)

export default authorisationFailedStep

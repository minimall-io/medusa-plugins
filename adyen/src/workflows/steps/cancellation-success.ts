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

export const cancellationSuccessStepId = 'cancellation-success-step'

const cancellationSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentSessionDTO, PaymentSessionDTO>> => {
  const {
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
  } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

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
    canceled_at: originalPayment.canceled_at ?? date,
    data: dataManager.getData(),
    id: originalPayment.id,
  }

  const paymentSessionToUpdate = {
    ...originalPaymentSession,
    status: PaymentSessionStatus.CANCELED,
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

const cancellationSuccessStepCompensate = async (
  originalPaymentSession: PaymentSessionDTO,
  stepExecutionContext: StepExecutionContext,
): Promise<StepResponse<PaymentSessionDTO>> => {
  const { container, workflowId, stepName, context } = stepExecutionContext
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPaymentSession ${JSON.stringify(originalPaymentSession, null, 2)}`,
  )

  const originalPayment = originalPaymentSession.payment!

  const dataManager = PaymentDataManager(originalPayment.data)

  const paymentToUpdate = {
    canceled_at: originalPayment.canceled_at,
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

const cancellationSuccessStep = createStep(
  cancellationSuccessStepId,
  cancellationSuccessStepInvoke,
  cancellationSuccessStepCompensate,
)

export default cancellationSuccessStep

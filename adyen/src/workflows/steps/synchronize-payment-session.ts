import type { Types } from '@adyen/api-library'
import type { PaymentSessionDTO } from '@medusajs/framework/types'
import {
  ContainerRegistrationKeys,
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

export const synchronizePaymentSessionStepId =
  'synchronize-payment-session-step'

const synchronizePaymentSessionStepCall = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentSessionDTO, NotificationRequestItem>> => {
  const { merchantReference } = notification
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
    `${workflowId}/${stepName}/call/originalPaymentSession ${JSON.stringify(originalPaymentSession, null, 2)}`,
  )

  const { id, amount, currency_code, payment } = originalPaymentSession

  const dataManager = PaymentDataManager(payment?.data)

  let status = PaymentSessionStatus.PENDING
  let authorized_at = originalPaymentSession.authorized_at

  if (payment) {
    status = PaymentSessionStatus.AUTHORIZED
    const authorisation = dataManager.getAuthorisation()
    if (authorisation?.status === 'FAILED') {
      status = PaymentSessionStatus.ERROR
      authorized_at = undefined
    }
  }

  if (payment?.captured_at) {
    status = PaymentSessionStatus.CAPTURED
  }

  if (payment?.canceled_at) {
    status = PaymentSessionStatus.CANCELED
  }

  const paymentSessionToUpdate = {
    amount,
    authorized_at,
    currency_code,
    data: dataManager.getData(),
    id,
    status,
  }

  await paymentService.updatePaymentSession(paymentSessionToUpdate, context)

  const newPaymentSession = await paymentService.retrievePaymentSession(
    originalPaymentSession.id,
    {
      relations: ['payment'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/call/newPaymentSession ${JSON.stringify(newPaymentSession, null, 2)}`,
  )

  return new StepResponse<PaymentSessionDTO, NotificationRequestItem>(
    newPaymentSession,
    notification,
  )
}

const synchronizePaymentSessionStep = createStep(
  synchronizePaymentSessionStepId,
  synchronizePaymentSessionStepCall,
  synchronizePaymentSessionStepCall,
)

export default synchronizePaymentSessionStep

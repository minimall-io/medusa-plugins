import type { Types } from '@adyen/api-library'
import type { PaymentSessionDTO } from '@medusajs/framework/types'
import { Modules, PaymentSessionStatus } from '@medusajs/framework/utils'
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
  { container, context }: StepExecutionContext,
): Promise<StepResponse<PaymentSessionDTO, NotificationRequestItem>> => {
  const { merchantReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)

  const originalPaymentSession = await paymentService.retrievePaymentSession(
    merchantReference,
    {
      relations: ['payment'],
    },
    context,
  )

  const originalPayment = originalPaymentSession.payment

  let status = PaymentSessionStatus.PENDING
  let authorized_at = originalPaymentSession.authorized_at

  if (originalPayment) {
    status = PaymentSessionStatus.AUTHORIZED
    const dataManager = PaymentDataManager(originalPayment.data)
    const authorisation = dataManager.getAuthorisation()
    if (authorisation?.status === 'FAILED') {
      status = PaymentSessionStatus.ERROR
      authorized_at = undefined
    }
  }

  if (originalPayment?.captured_at) {
    status = PaymentSessionStatus.CAPTURED
  }

  if (originalPayment?.canceled_at) {
    status = PaymentSessionStatus.CANCELED
  }

  const paymentSessionToUpdate = {
    ...originalPaymentSession,
    authorized_at,
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

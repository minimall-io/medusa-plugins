import type { Types } from '@adyen/api-library'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import type { PaymentData } from './types'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const getPaymentDataStepId = 'get-payment-data-step'

const getPaymentDataStepInvoke = async (
  notification: NotificationRequestItem,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<PaymentData>> => {
  const { merchantReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)

  const session = await paymentService.retrievePaymentSession(
    merchantReference,
    {
      relations: ['payment.*', 'payment.captures.*', 'payment.refunds.*'],
    },
    context,
  )

  const collectionId = session.payment_collection_id

  const collection = await paymentService.retrievePaymentCollection(
    collectionId,
    {
      relations: [
        'payment_sessions.*',
        'payment_sessions.payment.*',
        'payment_sessions.payment.captures.*',
        'payment_sessions.payment.refunds.*',
      ],
    },
    context,
  )

  if (!session.payment) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      'Payment session is missing payment!',
    )
  }

  const payment = session.payment

  const paymentData = {
    collection,
    notification,
    payment,
    session,
  }

  return new StepResponse<PaymentData>(paymentData)
}

const getPaymentDataStep = createStep(
  getPaymentDataStepId,
  getPaymentDataStepInvoke,
)

export default getPaymentDataStep

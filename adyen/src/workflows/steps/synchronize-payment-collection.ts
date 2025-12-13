import { Types } from '@adyen/api-library'
import type { PaymentCollectionDTO } from '@medusajs/framework/types'
import {
  ContainerRegistrationKeys,
  MathBN,
  Modules,
  PaymentCollectionStatus,
  PaymentSessionStatus,
} from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { filter, flatMap, map } from 'lodash'
import { roundToCurrencyPrecision } from '../../utils/formatters'

type NotificationRequestItem = Types.notification.NotificationRequestItem
const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
const SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum

export const synchronizePaymentCollectionStepId =
  'synchronize-payment-collection-step'

const synchronizePaymentCollectionStepCall = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentCollectionDTO, NotificationRequestItem>> => {
  const { merchantReference, eventCode, success } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const isCancellation =
    eventCode === EventCodeEnum.Cancellation ||
    eventCode === EventCodeEnum.TechnicalCancel
  const isCancellationSuccess = isCancellation && success === SuccessEnum.True

  const paymentSession = await paymentService.retrievePaymentSession(
    merchantReference,
    {
      select: ['payment_collection_id'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/call/paymentSession ${JSON.stringify(paymentSession, null, 2)}`,
  )

  const paymentCollectionId = paymentSession.payment_collection_id

  const originalPaymentCollection =
    await paymentService.retrievePaymentCollection(
      paymentCollectionId,
      {
        relations: [
          'payment_sessions.amount',
          'payment_sessions.raw_amount',
          'payments.captures.amount',
          'payments.captures.raw_amount',
          'payments.refunds.amount',
          'payments.refunds.raw_amount',
        ],
        select: ['amount', 'raw_amount', 'status', 'currency_code'],
      },
      context,
    )
  logging.debug(
    `${workflowId}/${stepName}/call/originalPaymentCollection ${JSON.stringify(originalPaymentCollection, null, 2)}`,
  )

  const paymentSessions = originalPaymentCollection.payment_sessions ?? []
  const captures = flatMap(originalPaymentCollection.payments, 'captures') ?? []
  const refunds = flatMap(originalPaymentCollection.payments, 'refunds') ?? []

  const authorizedAmount = MathBN.add(
    ...map(
      filter(paymentSessions, { status: PaymentSessionStatus.AUTHORIZED }),
      'amount',
    ),
  )
  const capturedAmount = MathBN.add(...map(captures, 'amount'))
  const refundedAmount = MathBN.add(...map(refunds, 'amount'))

  let completedAt: Date | undefined

  let status =
    paymentSessions.length === 0
      ? PaymentCollectionStatus.NOT_PAID
      : PaymentCollectionStatus.AWAITING

  if (MathBN.gt(authorizedAmount, 0)) {
    status = MathBN.gte(
      roundToCurrencyPrecision(
        authorizedAmount,
        originalPaymentCollection.currency_code,
      ),
      roundToCurrencyPrecision(
        originalPaymentCollection.amount,
        originalPaymentCollection.currency_code,
      ),
    )
      ? PaymentCollectionStatus.AUTHORIZED
      : PaymentCollectionStatus.PARTIALLY_AUTHORIZED
  }

  if (isCancellationSuccess) {
    status = PaymentCollectionStatus.CANCELED
  }

  if (MathBN.gt(capturedAmount, 0)) {
    status = PaymentCollectionStatus.PARTIALLY_CAPTURED
  }

  if (
    MathBN.gte(
      roundToCurrencyPrecision(
        capturedAmount,
        originalPaymentCollection.currency_code,
      ),
      roundToCurrencyPrecision(
        originalPaymentCollection.amount,
        originalPaymentCollection.currency_code,
      ),
    )
  ) {
    status = PaymentCollectionStatus.COMPLETED
    completedAt = new Date()
  }

  const paymentCollectionToUpdate = {
    authorized_amount: authorizedAmount,
    captured_amount: capturedAmount,
    completed_at: completedAt,
    refunded_amount: refundedAmount,
    status,
  }

  await paymentService.updatePaymentCollections(
    paymentCollectionId,
    paymentCollectionToUpdate,
    context,
  )

  const newPaymentCollection = await paymentService.retrievePaymentCollection(
    paymentCollectionId,
    {
      relations: [
        'payment_sessions.amount',
        'payment_sessions.raw_amount',
        'payments.captures.amount',
        'payments.captures.raw_amount',
        'payments.refunds.amount',
        'payments.refunds.raw_amount',
      ],
      select: ['amount', 'raw_amount', 'status', 'currency_code'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/call/newPaymentCollection ${JSON.stringify(newPaymentCollection, null, 2)}`,
  )

  return new StepResponse<PaymentCollectionDTO, NotificationRequestItem>(
    newPaymentCollection,
    notification,
  )
}

const synchronizePaymentCollectionStep = createStep(
  synchronizePaymentCollectionStepId,
  synchronizePaymentCollectionStepCall,
  synchronizePaymentCollectionStepCall,
)

export default synchronizePaymentCollectionStep

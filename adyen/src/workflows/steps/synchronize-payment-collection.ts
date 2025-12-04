import type { Types } from '@adyen/api-library'
import type { PaymentCollectionDTO } from '@medusajs/framework/types'
import {
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

export const synchronizePaymentCollectionStepId =
  'synchronize-payment-collection-step'

const synchronizePaymentCollectionStepCall = async (
  notification: NotificationRequestItem,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<PaymentCollectionDTO, NotificationRequestItem>> => {
  const { merchantReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)

  const paymentSession = await paymentService.retrievePaymentSession(
    merchantReference,
    {
      select: ['payment_collection_id'],
    },
    context,
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

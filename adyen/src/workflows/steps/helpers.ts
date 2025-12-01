import {
  MathBN,
  Modules,
  PaymentCollectionStatus,
  PaymentSessionStatus,
} from '@medusajs/framework/utils'
import type { StepExecutionContext } from '@medusajs/framework/workflows-sdk'
import { flatMap } from 'lodash'
import { roundToCurrencyPrecision } from '../../utils/formatters'

export const maybeUpdatePaymentCollection = async (
  paymentCollectionId: string,
  { container, context }: StepExecutionContext,
) => {
  const paymentService = container.resolve(Modules.PAYMENT)

  const paymentCollection = await paymentService.retrievePaymentCollection(
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

  const paymentSessions = paymentCollection.payment_sessions ?? []
  const captures = flatMap(paymentCollection.payments, 'captures') ?? []
  const refunds = flatMap(paymentCollection.payments, 'refunds') ?? []

  let authorizedAmount = MathBN.convert(0)
  let capturedAmount = MathBN.convert(0)
  let refundedAmount = MathBN.convert(0)
  let completedAt: Date | undefined

  for (const ps of paymentSessions) {
    if (ps.status === PaymentSessionStatus.AUTHORIZED) {
      authorizedAmount = MathBN.add(authorizedAmount, ps.amount)
    }
  }

  for (const capture of captures) {
    capturedAmount = MathBN.add(capturedAmount, capture.amount)
  }

  for (const refund of refunds) {
    refundedAmount = MathBN.add(refundedAmount, refund.amount)
  }

  let status =
    paymentSessions.length === 0
      ? PaymentCollectionStatus.NOT_PAID
      : PaymentCollectionStatus.AWAITING

  if (MathBN.gt(authorizedAmount, 0)) {
    status = MathBN.gte(
      roundToCurrencyPrecision(
        authorizedAmount,
        paymentCollection.currency_code,
      ),
      roundToCurrencyPrecision(
        paymentCollection.amount,
        paymentCollection.currency_code,
      ),
    )
      ? PaymentCollectionStatus.AUTHORIZED
      : PaymentCollectionStatus.PARTIALLY_AUTHORIZED
  }

  if (
    MathBN.gte(
      roundToCurrencyPrecision(capturedAmount, paymentCollection.currency_code),
      roundToCurrencyPrecision(
        paymentCollection.amount,
        paymentCollection.currency_code,
      ),
    )
  ) {
    status = PaymentCollectionStatus.COMPLETED
    completedAt = new Date()
  }

  const data = {
    authorized_amount: authorizedAmount,
    captured_amount: capturedAmount,
    completed_at: completedAt,
    refunded_amount: refundedAmount,
    status,
  }

  await paymentService.updatePaymentCollections(
    paymentCollectionId,
    data,
    context,
  )
}

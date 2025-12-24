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
import { every, filter, flatMap, map } from 'lodash'
import { roundToCurrencyPrecision } from '../../utils/formatters'
import type { PaymentData } from './types'

export const synchronizePaymentCollectionStepId =
  'synchronize-payment-collection-step'

const synchronizePaymentCollectionStepInvoke = async (
  input: PaymentData,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<undefined, PaymentData>> => {
  const { collection } = input
  const paymentService = container.resolve(Modules.PAYMENT)

  const newCollection = await paymentService.retrievePaymentCollection(
    collection.id,
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

  const paymentSessions = newCollection.payment_sessions ?? []
  const captures = flatMap(paymentSessions, 'payment.captures') ?? []
  const refunds = flatMap(paymentSessions, 'payment.refunds') ?? []

  const authorizedAmount = MathBN.add(
    ...map(
      filter(paymentSessions, { status: PaymentSessionStatus.AUTHORIZED }),
      'amount',
    ),
  )

  const isCancelled = every(paymentSessions, {
    status: PaymentSessionStatus.CANCELED,
  })
  const capturedAmount = MathBN.add(...map(captures, 'amount'))
  const refundedAmount = MathBN.add(...map(refunds, 'amount'))

  let completedAt: Date | undefined

  let status =
    paymentSessions.length === 0
      ? PaymentCollectionStatus.NOT_PAID
      : PaymentCollectionStatus.AWAITING

  if (MathBN.gt(authorizedAmount, 0)) {
    status = MathBN.gte(
      roundToCurrencyPrecision(authorizedAmount, newCollection.currency_code),
      roundToCurrencyPrecision(
        newCollection.amount,
        newCollection.currency_code,
      ),
    )
      ? PaymentCollectionStatus.AUTHORIZED
      : PaymentCollectionStatus.PARTIALLY_AUTHORIZED
  }

  if (isCancelled) {
    status = PaymentCollectionStatus.CANCELED
  }

  if (MathBN.gt(capturedAmount, 0)) {
    status = PaymentCollectionStatus.PARTIALLY_CAPTURED
  }

  if (
    MathBN.gte(
      roundToCurrencyPrecision(capturedAmount, newCollection.currency_code),
      roundToCurrencyPrecision(
        newCollection.amount,
        newCollection.currency_code,
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
    collection.id,
    paymentCollectionToUpdate,
    context,
  )

  return new StepResponse<undefined, PaymentData>(undefined, input)
}

const synchronizePaymentCollectionStepCompensate = async (
  input: PaymentData,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { collection } = input
  const paymentService = container.resolve(Modules.PAYMENT)

  const {
    authorized_amount,
    captured_amount,
    completed_at,
    refunded_amount,
    status,
  } = collection

  const paymentCollectionToUpdate = {
    authorized_amount,
    captured_amount,
    completed_at,
    refunded_amount,
    status,
  }

  await paymentService.updatePaymentCollections(
    collection.id,
    paymentCollectionToUpdate,
    context,
  )

  return new StepResponse<undefined>()
}

const synchronizePaymentCollectionStep = createStep(
  synchronizePaymentCollectionStepId,
  synchronizePaymentCollectionStepInvoke,
  synchronizePaymentCollectionStepCompensate,
)

export default synchronizePaymentCollectionStep

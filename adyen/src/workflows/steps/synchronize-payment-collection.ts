import type { Types } from '@adyen/api-library'
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
import { every, filter, flatMap, map } from 'lodash'
import { roundToCurrencyPrecision } from '../../utils/formatters'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const synchronizePaymentCollectionStepId =
  'synchronize-payment-collection-step'

const synchronizePaymentCollectionStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentCollectionDTO, PaymentCollectionDTO>> => {
  const { merchantReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const paymentSession = await paymentService.retrievePaymentSession(
    merchantReference,
    {
      select: ['payment_collection_id'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/paymentSession ${JSON.stringify(paymentSession, null, 2)}`,
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
        select: [
          'amount',
          'raw_amount',
          'status',
          'currency_code',
          'authorized_amount',
          'captured_amount',
          'completed_at',
          'refunded_amount',
        ],
      },
      context,
    )
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPaymentCollection ${JSON.stringify(originalPaymentCollection, null, 2)}`,
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

  if (isCancelled) {
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
      select: [
        'amount',
        'raw_amount',
        'status',
        'currency_code',
        'authorized_amount',
        'captured_amount',
        'completed_at',
        'refunded_amount',
      ],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPaymentCollection ${JSON.stringify(newPaymentCollection, null, 2)}`,
  )

  return new StepResponse<PaymentCollectionDTO, PaymentCollectionDTO>(
    newPaymentCollection,
    originalPaymentCollection,
  )
}

const synchronizePaymentCollectionStepCompensate = async (
  originalPaymentCollection: PaymentCollectionDTO,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentCollectionDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPaymentCollection ${JSON.stringify(originalPaymentCollection, null, 2)}`,
  )

  const {
    authorized_amount,
    captured_amount,
    completed_at,
    refunded_amount,
    status,
    id,
  } = originalPaymentCollection

  const paymentCollectionToUpdate = {
    authorized_amount,
    captured_amount,
    completed_at,
    refunded_amount,
    status,
  }

  await paymentService.updatePaymentCollections(
    id,
    paymentCollectionToUpdate,
    context,
  )

  const restoredPaymentCollection =
    await paymentService.retrievePaymentCollection(
      id,
      {
        relations: [
          'payment_sessions.amount',
          'payment_sessions.raw_amount',
          'payments.captures.amount',
          'payments.captures.raw_amount',
          'payments.refunds.amount',
          'payments.refunds.raw_amount',
        ],
        select: [
          'amount',
          'raw_amount',
          'status',
          'currency_code',
          'authorized_amount',
          'captured_amount',
          'completed_at',
          'refunded_amount',
        ],
      },
      context,
    )
  logging.debug(
    `${workflowId}/${stepName}/compensate/newPaymentCollection ${JSON.stringify(restoredPaymentCollection, null, 2)}`,
  )

  return new StepResponse<PaymentCollectionDTO>(restoredPaymentCollection)
}

const synchronizePaymentCollectionStep = createStep(
  synchronizePaymentCollectionStepId,
  synchronizePaymentCollectionStepInvoke,
  synchronizePaymentCollectionStepCompensate,
)

export default synchronizePaymentCollectionStep

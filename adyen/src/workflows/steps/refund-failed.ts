import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { find } from 'lodash'
import { PaymentDataManager } from '../../utils'
import type { PaymentData } from './types'

export const refundFailedStepId = 'refund-failed-step'

const refundFailedStepInvoke = async (
  input: PaymentData,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined, PaymentData>> => {
  const { notification, payment } = input
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
      'Refund notification is missing amount information!',
    )
  }

  logging.debug(
    `${workflowId}/${stepName}/invoke/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(payment.data)

  if (!dataManager.isAuthorised()) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Payment not authorised!',
    )
  }

  const originalDataRefund = dataManager.getEvent(providerReference)

  if (originalDataRefund?.id) {
    await paymentService.deleteRefunds([originalDataRefund.id], context)
  }

  dataManager.setEvent({
    amount: { currency, value },
    date,
    id: 'MISSING',
    merchantReference,
    message,
    name: 'REFUND',
    providerReference,
    status: 'FAILED',
  })

  const paymentToUpdate = {
    data: dataManager.getData(),
    id: payment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined, PaymentData>(undefined, input)
}

const refundFailedStepCompensate = async (
  input: PaymentData,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { payment, notification } = input
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(payment.data)
  const originalDataRefund = dataManager.getEvent(pspReference)
  const originalPaymentRefund = find(
    payment.refunds,
    (refund) => refund.id === originalDataRefund?.id,
  )

  if (originalPaymentRefund) {
    dataManager.setData({ webhook: originalDataRefund })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: payment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
    const paymentRefundToCreate = {
      amount: originalPaymentRefund.amount,
      created_by: originalPaymentRefund.created_by,
      payment_id: payment.id,
    }
    await paymentService.refundPayment(paymentRefundToCreate, context)
  } else {
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: payment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
  }

  return new StepResponse<undefined>()
}

const refundFailedStep = createStep(
  refundFailedStepId,
  refundFailedStepInvoke,
  refundFailedStepCompensate,
)

export default refundFailedStep

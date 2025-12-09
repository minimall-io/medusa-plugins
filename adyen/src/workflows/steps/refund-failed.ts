import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
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

type NotificationRequestItem = Types.notification.NotificationRequestItem

interface RefundFailedStepCompensateInput {
  originalPayment: PaymentDTO
  notification: NotificationRequestItem
}

export const refundFailedStepId = 'refund-failed-step'

const refundFailedStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, RefundFailedStepCompensateInput>> => {
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

  const [originalPayment] = await paymentService.listPayments(
    {
      payment_session_id: merchantReference,
    },
    {
      relations: ['refunds'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

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
    id: originalPayment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  const newPayment = await paymentService.retrievePayment(
    originalPayment.id,
    {
      relations: ['refunds'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, RefundFailedStepCompensateInput>(
    newPayment,
    { notification, originalPayment },
  )
}

const refundFailedStepCompensate = async (
  { originalPayment, notification }: RefundFailedStepCompensateInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)
  const originalDataRefund = dataManager.getEvent(pspReference)
  const originalPaymentRefund = find(
    originalPayment.refunds,
    (refund) => refund.id === originalDataRefund?.id,
  )

  if (originalPaymentRefund) {
    dataManager.setData({ webhook: originalDataRefund })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
    const paymentRefundToCreate = {
      amount: originalPaymentRefund.amount,
      created_by: originalPaymentRefund.created_by,
      payment_id: originalPayment.id,
    }
    await paymentService.refundPayment(paymentRefundToCreate, context)
  } else {
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
  }

  const restoredPayment = await paymentService.retrievePayment(
    originalPayment.id,
    {
      relations: ['refunds'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/restoredPayment ${JSON.stringify(restoredPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO>(restoredPayment)
}

const refundFailedStep = createStep(
  refundFailedStepId,
  refundFailedStepInvoke,
  refundFailedStepCompensate,
)

export default refundFailedStep

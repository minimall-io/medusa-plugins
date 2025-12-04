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
import { getWholeUnit, PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

interface RefundSuccessStepCompensateInput {
  originalPayment: PaymentDTO
  notification: NotificationRequestItem
}

export const refundSuccessStepId = 'refund-success-step'

const refundSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, RefundSuccessStepCompensateInput>> => {
  const {
    amount: { value, currency },
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
    merchantAccountCode,
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

  if (originalDataRefund && originalDataRefund.id !== 'MISSING') {
    dataManager.setEvent({
      amount: { currency, value },
      date,
      id: originalDataRefund.id,
      merchantReference,
      name: 'REFUND',
      providerReference,
      status: 'SUCCEEDED',
    })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
  } else {
    dataManager.setData({
      webhook: {
        amount: { currency, value },
        date,
        id: 'MISSING',
        merchantReference,
        name: 'REFUND',
        providerReference,
        status: 'SUCCEEDED',
      },
    })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
    const paymentRefundToCreate = {
      amount: getWholeUnit(value, currency),
      created_by: merchantAccountCode,
      payment_id: originalPayment.id,
    }
    await paymentService.refundPayment(paymentRefundToCreate, context)
  }

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

  return new StepResponse<PaymentDTO, RefundSuccessStepCompensateInput>(
    newPayment,
    { notification, originalPayment },
  )
}

const refundSuccessStepCompensate = async (
  { originalPayment, notification }: RefundSuccessStepCompensateInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

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

  const originalDataManager = PaymentDataManager(originalPayment.data)
  const newDataManager = PaymentDataManager(newPayment.data)
  const originalDataRefund = originalDataManager.getEvent(pspReference)
  const newDataRefund = newDataManager.getEvent(pspReference)

  if (
    (!originalDataRefund || originalDataRefund.id === 'MISSING') &&
    newDataRefund &&
    newDataRefund.id !== 'MISSING'
  ) {
    await paymentService.deleteRefunds([newDataRefund.id], context)
  }
  const paymentToUpdate = {
    data: originalDataManager.getData(),
    id: originalPayment.id,
  }
  await paymentService.updatePayment(paymentToUpdate, context)

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

const refundSuccessStep = createStep(
  refundSuccessStepId,
  refundSuccessStepInvoke,
  refundSuccessStepCompensate,
)

export default refundSuccessStep

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
import type { NotificationStepInput } from './types'

type NotificationRequestItem = Types.notification.NotificationRequestItem

interface RefundSuccessStepCompensateInput {
  originalPayment: PaymentDTO
  notification: NotificationRequestItem
}

export const refundSuccessStepId = 'refund-success-step'

const refundSuccessStepInvoke = async (
  input: NotificationStepInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined, NotificationStepInput>> => {
  const { notification, payment } = input
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
      id: payment.id,
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
      id: payment.id,
    }
    await paymentService.updatePayment(paymentToUpdate, context)
    const paymentRefundToCreate = {
      amount: getWholeUnit(value, currency),
      created_by: merchantAccountCode,
      payment_id: payment.id,
    }
    await paymentService.refundPayment(paymentRefundToCreate, context)
  }

  return new StepResponse<undefined, NotificationStepInput>(undefined, input)
}

const refundSuccessStepCompensate = async (
  input: NotificationStepInput,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { payment, notification } = input
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/payment ${JSON.stringify(payment, null, 2)}`,
  )

  const newPayment = await paymentService.retrievePayment(
    payment.id,
    {
      relations: ['refunds'],
    },
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  const originalDataManager = PaymentDataManager(payment.data)
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
    id: payment.id,
  }
  await paymentService.updatePayment(paymentToUpdate, context)

  return new StepResponse<undefined>()
}

const refundSuccessStep = createStep(
  refundSuccessStepId,
  refundSuccessStepInvoke,
  refundSuccessStepCompensate,
)

export default refundSuccessStep

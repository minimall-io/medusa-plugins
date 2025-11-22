import type { Types } from '@adyen/api-library'
import type { PaymentDTO, RefundDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy, map } from 'lodash'
import { getWholeUnit, PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const refundSuccessStepId = 'refund-success-step'

const refundSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const {
    merchantReference,
    amount: { value, currency },
    pspReference: providerReference,
    eventDate: date,
    merchantAccountCode,
  } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const [originalPayment] = await paymentService.listPayments(
    {
      payment_session_id: merchantReference,
    },
    {
      relations: ['refunds'],
    },
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const dataRefund = dataManager.getEvent(providerReference)

  if (dataRefund) {
    dataManager.setEvent({ ...dataRefund, date, status: 'SUCCEEDED' })
    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate)
  } else if (value !== undefined && currency !== undefined) {
    dataManager.setData({ webhook: true })
    const webhookPayment = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(webhookPayment)
    const paymentRefundToCreate = {
      amount: getWholeUnit(value, currency),
      created_by: merchantAccountCode,
      payment_id: originalPayment.id,
    }
    await paymentService.refundPayment(paymentRefundToCreate)
    const newPaymentRefunds = await paymentService.listRefunds({
      payment_id: originalPayment.id,
    })
    const [newPaymentRefund]: RefundDTO[] = differenceBy(
      newPaymentRefunds,
      originalPayment.refunds,
      'id',
    )
    dataManager.setEvent({
      amount: { currency, value },
      date,
      id: newPaymentRefund.id,
      merchantReference,
      name: 'REFUND',
      providerReference,
      status: 'SUCCEEDED',
    })
    dataManager.setData({ webhook: false })

    const paymentToUpdate = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate)
  }

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['refunds'],
  })
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const refundSuccessStepCompensate = async (
  originalPayment: PaymentDTO,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const newPaymentRefunds = await paymentService.listRefunds({
    payment_id: originalPayment.id,
  })
  const paymentRefundsToDelete: string[] = map(
    differenceBy(newPaymentRefunds, originalPayment.refunds, 'id'),
    'id',
  )

  await paymentService.deleteRefunds(paymentRefundsToDelete)
  const paymentToUpdate = {
    data: dataManager.getData(),
    id: originalPayment.id,
  }
  await paymentService.updatePayment(paymentToUpdate)

  const restoredPayment = await paymentService.retrievePayment(
    originalPayment.id,
    {
      relations: ['refunds'],
    },
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

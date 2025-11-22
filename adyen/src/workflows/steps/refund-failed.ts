import type { Types } from '@adyen/api-library'
import type { PaymentDTO, RefundDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy } from 'lodash'
import { PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

interface RefundFailedStepCompensateInput {
  originalPayment: PaymentDTO
  notification: NotificationRequestItem
}

export const refundFailedStepId = 'refund-failed-step'

const refundFailedStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, RefundFailedStepCompensateInput>> => {
  const {
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
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
    dataManager.setEvent({ ...dataRefund, date, status: 'FAILED' })
  }

  const paymentToUpdate = {
    data: dataManager.getData(),
    id: originalPayment.id,
  }
  await paymentService.updatePayment(paymentToUpdate)
  if (dataRefund?.id) {
    await paymentService.deleteRefunds([dataRefund.id])
  }

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['refunds'],
  })
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
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const { pspReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['refunds'],
  })
  logging.debug(
    `${workflowId}/${stepName}/compensate/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const [originalPaymentRefund]: RefundDTO[] = differenceBy(
    originalPayment.refunds,
    newPayment.refunds,
    'id',
  )

  if (originalPaymentRefund) {
    dataManager.setData({ webhook: true })
    const webhookPayment = {
      data: dataManager.getData(),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(webhookPayment)
    const paymentRefundToCreate = {
      amount: originalPaymentRefund.amount,
      created_by: originalPaymentRefund.created_by,
      payment_id: originalPayment.id,
    }
    await paymentService.refundPayment(paymentRefundToCreate)
    const restoredPaymentRefunds = await paymentService.listRefunds({
      payment_id: originalPayment.id,
    })
    const [restoredPaymentRefund] = differenceBy(
      restoredPaymentRefunds,
      newPayment.refunds,
      'id',
    )
    const dataRefund = dataManager.getEvent(pspReference)
    if (dataRefund) {
      dataManager.setEvent({
        ...dataRefund,
        id: restoredPaymentRefund.id,
      })
    }
    dataManager.setData({ webhook: false })
  }

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

const refundFailedStep = createStep(
  refundFailedStepId,
  refundFailedStepInvoke,
  refundFailedStepCompensate,
)

export default refundFailedStep

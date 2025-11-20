import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy, find } from 'lodash'
import { managePaymentData, type PaymentModification } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const refundFailureStepId = 'refund-failure-step'

const refundFailureStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { merchantReference, pspReference } = notification
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

  const { getRefund, deleteRefund } = managePaymentData(originalPayment.data)

  const dataRefund = getRefund(pspReference)
  const paymentToUpdate = {
    data: deleteRefund(pspReference),
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

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const refundFailureStepCompensate = async (
  originalPayment: PaymentDTO,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
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

  const {
    listRefunds: originalListRefunds,
    updateData,
    updateRefund,
  } = managePaymentData(originalPayment.data)
  const { listRefunds: newListRefunds } = managePaymentData(newPayment.data)

  const [dataRefund]: PaymentModification[] = differenceBy(
    originalListRefunds(),
    newListRefunds(),
    'id',
  )
  if (dataRefund) {
    const originalPaymentRefunds = find(originalPayment.refunds, {
      id: dataRefund.id,
    })
    const webhookPayment = {
      data: updateData({ webhook: true }),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(webhookPayment)
    const paymentRefundToCreate = {
      amount: originalPaymentRefunds.amount,
      created_by: originalPaymentRefunds.created_by,
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
    const dataRefundToAdd = { ...dataRefund, id: restoredPaymentRefund.id }
    const paymentToUpdate = {
      data: updateRefund(dataRefundToAdd),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate)
  }

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

const refundFailureStep = createStep(
  refundFailureStepId,
  refundFailureStepInvoke,
  refundFailureStepCompensate,
)

export default refundFailureStep

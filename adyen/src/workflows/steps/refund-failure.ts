import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy, find } from 'lodash'
import { type Event, PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const refundFailureStepId = 'refund-failure-step'

const refundFailureStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const {
    merchantReference,
    amount: { value, currency },
    pspReference: providerReference,
    eventDate: date,
  } = notification
  const status = 'failed'
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

  if (value !== undefined && currency !== undefined) {
    dataManager.setEvent({
      amount: { currency, value },
      date,
      id: dataRefund?.id,
      merchantReference,
      name: 'REFUND',
      providerReference,
      status,
    })
  }

  const paymentToUpdate = {
    captured_at: undefined,
    data: dataManager.getData(),
    id: originalPayment.id,
  }
  await paymentService.updatePayment(paymentToUpdate)
  if (dataRefund?.id) {
    await paymentService.deleteCaptures([dataRefund.id])
  }

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
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

  const originalDataManager = PaymentDataManager(originalPayment.data)
  const newDataManager = PaymentDataManager(newPayment.data)

  const [dataRefund]: Event[] = differenceBy(
    originalDataManager.getRefunds(),
    newDataManager.getRefunds(),
    'id',
  )
  if (dataRefund) {
    const originalPaymentRefunds = find(originalPayment.refunds, {
      id: dataRefund.id,
    })
    originalDataManager.setData({ webhook: true })
    const webhookPayment = {
      data: originalDataManager.getData(),
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
    originalDataManager.setData({ webhook: false })
    originalDataManager.setEvent({
      ...dataRefund,
      id: restoredPaymentRefund.id,
    })

    const paymentToUpdate = {
      data: originalDataManager.getData(),
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

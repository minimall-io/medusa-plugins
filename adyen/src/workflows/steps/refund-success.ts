import type { Types } from '@adyen/api-library'
import type { CaptureDTO, PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { differenceBy, map } from 'lodash'
import { getWholeUnit, managePaymentData } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const refundSuccessStepId = 'refund-success-step'

const refundSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const {
    merchantReference: reference,
    amount: { value, currency },
    merchantAccountCode,
    pspReference,
  } = notification
  const status = 'success'
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const [originalPayment] = await paymentService.listPayments(
    {
      payment_session_id: reference,
    },
    {
      relations: ['refunds'],
    },
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const { getRefund, updateRefund, updateData } = managePaymentData(
    originalPayment.data,
  )

  const dataRefund = getRefund(pspReference)

  if (dataRefund) {
    const paymentToUpdate = {
      data: updateRefund({ ...dataRefund, status }),
      id: originalPayment.id,
    }
    await paymentService.updatePayment(paymentToUpdate)
  } else if (value !== undefined && currency !== undefined) {
    const webhookPayment = {
      data: updateData({ webhook: true }),
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
    const [newPaymentRefund]: CaptureDTO[] = differenceBy(
      newPaymentRefunds,
      originalPayment.refunds,
      'id',
    )
    const newDataRefund = {
      amount: { currency, value },
      id: newPaymentRefund.id,
      pspReference,
      reference,
      status,
    }
    const paymentToUpdate = {
      data: updateRefund(newDataRefund),
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

  const { listRefunds } = managePaymentData(originalPayment.data)

  const newPaymentRefunds = await paymentService.listRefunds({
    payment_id: originalPayment.id,
  })
  const paymentRefundsToDelete: string[] = map(
    differenceBy(newPaymentRefunds, originalPayment.refunds, 'id'),
    'id',
  )

  await paymentService.deleteRefunds(paymentRefundsToDelete)
  const dataToUpdate = {
    ...originalPayment.data,
    refunds: listRefunds(),
  } as PaymentDTO['data']
  const paymentToUpdate = {
    data: dataToUpdate,
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

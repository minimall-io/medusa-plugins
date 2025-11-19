import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { managePaymentData } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const cancellationSuccessStepId = 'cancellation-success-step'

const cancellationSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const {
    merchantReference: reference,
    amount: { value, currency },
    pspReference,
  } = notification
  const status = 'success'
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const [originalPayment] = await paymentService.listPayments({
    payment_session_id: reference,
  })
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const { updateCancellation } = managePaymentData(originalPayment.data)

  const amount =
    value !== undefined && currency !== undefined
      ? { currency, value }
      : undefined

  const newDataCancellation = {
    amount,
    id: originalPayment.id,
    pspReference,
    reference,
    status,
  }

  const paymentToUpdate = {
    canceled_at: originalPayment.canceled_at ?? new Date(),
    data: updateCancellation(newDataCancellation),
    id: originalPayment.id,
  }

  await paymentService.updatePayment(paymentToUpdate)

  const newPayment = await paymentService.retrievePayment(originalPayment.id)
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const cancellationSuccessStepCompensate = async (
  originalPayment: PaymentDTO,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const { getCancellation } = managePaymentData(originalPayment.data)

  const dataToUpdate = {
    ...originalPayment.data,
    cancellation: getCancellation(),
  } as PaymentDTO['data']
  const paymentToUpdate = {
    canceled_at: originalPayment.canceled_at,
    data: dataToUpdate,
    id: originalPayment.id,
  }
  await paymentService.updatePayment(paymentToUpdate)

  const restoredPayment = await paymentService.retrievePayment(
    originalPayment.id,
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/restoredPayment ${JSON.stringify(restoredPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO>(restoredPayment)
}

const cancellationSuccessStep = createStep(
  cancellationSuccessStepId,
  cancellationSuccessStepInvoke,
  cancellationSuccessStepCompensate,
)

export default cancellationSuccessStep

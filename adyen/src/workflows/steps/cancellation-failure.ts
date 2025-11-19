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

export const cancellationFailureStepId = 'cancellation-failure-step'

const cancellationFailureStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { merchantReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const [originalPayment] = await paymentService.listPayments({
    payment_session_id: merchantReference,
  })
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const { deleteCancellation } = managePaymentData(originalPayment.data)

  const paymentToUpdate = {
    canceled_at: undefined,
    data: deleteCancellation(),
    id: originalPayment.id,
  }
  await paymentService.updatePayment(paymentToUpdate)

  const newPayment = await paymentService.retrievePayment(originalPayment.id, {
    relations: ['captures'],
  })
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const cancellationFailureStepCompensate = async (
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

const cancellationFailureStep = createStep(
  cancellationFailureStepId,
  cancellationFailureStepInvoke,
  cancellationFailureStepCompensate,
)

export default cancellationFailureStep

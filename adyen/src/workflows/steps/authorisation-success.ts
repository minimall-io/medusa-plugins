import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const authorisationSuccessStepId = 'authorisation-success-step'

const authorisationSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { merchantReference, pspReference, eventDate: date } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const [originalPayment] = await paymentService.listPayments({
    payment_session_id: merchantReference,
  })
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const authorisation = dataManager.getAuthorisation()

  if (authorisation.providerReference !== pspReference) {
    throw new Error('Payment reference mismatch!')
  }

  dataManager.setAuthorisation({ ...authorisation, date, status: 'SUCCEEDED' })

  const paymentToUpdate = {
    data: dataManager.getData(),
    id: originalPayment.id,
  }

  await paymentService.updatePayment(paymentToUpdate)

  const newPayment = await paymentService.retrievePayment(originalPayment.id)
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const authorisationSuccessStepCompensate = async (
  originalPayment: PaymentDTO,
  { container, workflowId, stepName }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const paymentToUpdate = {
    data: dataManager.getData(),
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

const authorisationSuccessStep = createStep(
  authorisationSuccessStepId,
  authorisationSuccessStepInvoke,
  authorisationSuccessStepCompensate,
)

export default authorisationSuccessStep

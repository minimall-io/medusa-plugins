import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { getMinorUnit, PaymentDataManager } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const authorisationFailedStepId = 'authorisation-failed-step'

const authorisationFailedStepInvoke = async (
  notification: NotificationRequestItem,
  { container, workflowId, stepName, context }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const {
    merchantReference,
    pspReference: providerReference,
    eventDate: date,
    reason: notes,
  } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)

  const [originalPayment] = await paymentService.listPayments(
    {
      payment_session_id: merchantReference,
    },
    undefined,
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const authorisation = dataManager.getAuthorisation()

  const value =
    authorisation?.amount.value ||
    notification.amount.value ||
    getMinorUnit(originalPayment.amount, originalPayment.currency_code)

  const currency =
    authorisation?.amount.currency ||
    notification.amount.currency ||
    originalPayment.currency_code

  dataManager.setAuthorisation({
    amount: { currency, value },
    date,
    merchantReference,
    name: 'AUTHORISATION',
    notes,
    providerReference,
    status: 'FAILED',
  })

  const paymentToUpdate = {
    data: dataManager.getData(),
    id: originalPayment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  const paymentSessionToUpdate = {
    amount: originalPayment.amount,
    currency_code: originalPayment.currency_code,
    data: dataManager.getData(),
    id: merchantReference,
    status: 'error' as const,
  }
  await paymentService.updatePaymentSession(paymentSessionToUpdate, context)

  const newPayment = await paymentService.retrievePayment(
    originalPayment.id,
    undefined,
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const authorisationFailedStepCompensate = async (
  originalPayment: PaymentDTO,
  { container, workflowId, stepName, context }: StepExecutionContext,
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
  await paymentService.updatePayment(paymentToUpdate, context)

  const restoredPayment = await paymentService.retrievePayment(
    originalPayment.id,
    undefined,
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/compensate/restoredPayment ${JSON.stringify(restoredPayment, null, 2)}`,
  )

  return new StepResponse<PaymentDTO>(restoredPayment)
}

const authorisationFailedStep = createStep(
  authorisationFailedStepId,
  authorisationFailedStepInvoke,
  authorisationFailedStepCompensate,
)

export default authorisationFailedStep

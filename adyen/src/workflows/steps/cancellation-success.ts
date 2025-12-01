import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { getMinorUnit, PaymentDataManager } from '../../utils'
import { maybeUpdatePaymentCollection } from './helpers'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export const cancellationSuccessStepId = 'cancellation-success-step'

const cancellationSuccessStepInvoke = async (
  notification: NotificationRequestItem,
  stepExecutionContext: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { container, workflowId, stepName, context } = stepExecutionContext
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

  const amount = { currency, value }

  dataManager.setEvent({
    amount,
    date,
    id: originalPayment.id,
    merchantReference,
    name: 'CANCELLATION',
    providerReference,
    status: 'SUCCEEDED',
  })

  const paymentToUpdate = {
    canceled_at: originalPayment.canceled_at ?? date,
    data: dataManager.getData(),
    id: originalPayment.id,
  }

  await paymentService.updatePayment(paymentToUpdate, context)

  const newPayment = await paymentService.retrievePayment(
    originalPayment.id,
    undefined,
    context,
  )
  logging.debug(
    `${workflowId}/${stepName}/invoke/newPayment ${JSON.stringify(newPayment, null, 2)}`,
  )

  await maybeUpdatePaymentCollection(
    originalPayment.payment_collection_id,
    stepExecutionContext,
  )

  return new StepResponse<PaymentDTO, PaymentDTO>(newPayment, originalPayment)
}

const cancellationSuccessStepCompensate = async (
  originalPayment: PaymentDTO,
  stepExecutionContext: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const { container, workflowId, stepName, context } = stepExecutionContext
  const paymentService = container.resolve(Modules.PAYMENT)
  const logging = container.resolve(ContainerRegistrationKeys.LOGGER)
  logging.debug(
    `${workflowId}/${stepName}/compensate/originalPayment ${JSON.stringify(originalPayment, null, 2)}`,
  )

  const dataManager = PaymentDataManager(originalPayment.data)

  const paymentToUpdate = {
    canceled_at: originalPayment.canceled_at,
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

  await maybeUpdatePaymentCollection(
    originalPayment.payment_collection_id,
    stepExecutionContext,
  )

  return new StepResponse<PaymentDTO>(restoredPayment)
}

const cancellationSuccessStep = createStep(
  cancellationSuccessStepId,
  cancellationSuccessStepInvoke,
  cancellationSuccessStepCompensate,
)

export default cancellationSuccessStep

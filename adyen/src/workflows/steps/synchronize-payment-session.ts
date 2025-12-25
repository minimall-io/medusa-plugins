import { Modules, PaymentSessionStatus } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'
import { PaymentDataManager } from '../../utils'
import type { PaymentData } from './types'

export const synchronizePaymentSessionStepId =
  'synchronize-payment-session-step'

const synchronizePaymentSessionStepInvoke = async (
  input: PaymentData,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<undefined, PaymentData>> => {
  const { session } = input
  const paymentService = container.resolve(Modules.PAYMENT)

  const newSession = await paymentService.retrievePaymentSession(
    session.id,
    {
      relations: ['payment.*', 'payment.captures.*', 'payment.refunds.*'],
    },
    context,
  )

  const { id, amount, currency_code, payment } = newSession

  const dataManager = PaymentDataManager({
    ...newSession.data,
    ...payment?.data,
  })

  let status = PaymentSessionStatus.PENDING

  if (payment) {
    status = PaymentSessionStatus.AUTHORIZED
    const authorisation = dataManager.getAuthorisation()
    if (authorisation?.status === 'FAILED') {
      status = PaymentSessionStatus.ERROR
    }
  }

  if (payment?.captured_at) {
    status = PaymentSessionStatus.CAPTURED
  }

  if (payment?.canceled_at) {
    status = PaymentSessionStatus.CANCELED
  }

  const paymentSessionToUpdate = {
    amount,
    currency_code,
    data: dataManager.getData(),
    id,
    status,
  }

  await paymentService.updatePaymentSession(paymentSessionToUpdate, context)

  return new StepResponse<undefined, PaymentData>(undefined, input)
}

const synchronizePaymentSessionStepCompensate = async (
  input: PaymentData,
  { container, context }: StepExecutionContext,
): Promise<StepResponse<undefined>> => {
  const { session } = input
  const paymentService = container.resolve(Modules.PAYMENT)

  const { id, amount, currency_code, payment, status } = session

  const dataManager = PaymentDataManager(payment?.data)

  const paymentSessionToUpdate = {
    amount,
    currency_code,
    data: dataManager.getData(),
    id,
    status,
  }

  await paymentService.updatePaymentSession(paymentSessionToUpdate, context)

  return new StepResponse<undefined>()
}

const synchronizePaymentSessionStep = createStep(
  synchronizePaymentSessionStepId,
  synchronizePaymentSessionStepInvoke,
  synchronizePaymentSessionStepCompensate,
)

export default synchronizePaymentSessionStep

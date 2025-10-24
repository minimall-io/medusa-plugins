import { PaymentDTO } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import {
  StepExecutionContext,
  StepResponse,
  createStep,
} from '@medusajs/framework/workflows-sdk'

export const updatePaymentStepId = 'update-payment-step'

const updatePaymentStepInvoke = async (
  payment: PaymentDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const originalPayment = await paymentService.retrievePayment(payment.id)
  const updatedPayment = await paymentService.updatePayment(payment)
  console.log(
    'updatePaymentStepInvoke/originalPayment',
    JSON.stringify(originalPayment, null, 2),
  )
  console.log(
    'updatePaymentStepInvoke/updatedPayment',
    JSON.stringify(updatedPayment, null, 2),
  )
  return new StepResponse<PaymentDTO, PaymentDTO>(
    updatedPayment,
    originalPayment,
  )
}

const updatePaymentStepCompensate = async (
  originalPayment: PaymentDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const updatedPayment = await paymentService.updatePayment(originalPayment)
  return new StepResponse<PaymentDTO>(updatedPayment)
}

const updatePaymentStep = createStep(
  updatePaymentStepId,
  updatePaymentStepInvoke,
  updatePaymentStepCompensate,
)

export default updatePaymentStep

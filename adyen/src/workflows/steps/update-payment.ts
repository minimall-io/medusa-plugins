import { ModulesSdkTypes, PaymentDTO } from '@medusajs/framework/types'
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
  const paymentService = container.resolve(
    'paymentService',
  ) as ModulesSdkTypes.IMedusaInternalService<any>
  const originalPayment = await paymentService.retrieve(payment.id)
  const updatedPayment = await paymentService.update(payment)
  return new StepResponse<PaymentDTO, PaymentDTO>(
    updatedPayment,
    originalPayment,
  )
}

const updatePaymentStepCompensate = async (
  originalPayment: PaymentDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(
    'paymentService',
  ) as ModulesSdkTypes.IMedusaInternalService<any>
  const updatedPayment = await paymentService.update(originalPayment)
  return new StepResponse<PaymentDTO>(updatedPayment)
}

const updatePaymentStep = createStep(
  updatePaymentStepId,
  updatePaymentStepInvoke,
  updatePaymentStepCompensate,
)

export default updatePaymentStep

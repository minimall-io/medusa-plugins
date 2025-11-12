import type { CreateCaptureDTO, PaymentDTO } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'

export const createPaymentCaptureStepId = 'create-payment-capture-step'

type Payments = Record<string, PaymentDTO>

const getCaptureIds = (payment: PaymentDTO): string[] =>
  payment.captures?.map((capture) => capture.id) || []

const createPaymentCaptureStepInvoke = async (
  capture: CreateCaptureDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, Record<string, PaymentDTO>>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const originalPayment = await paymentService.retrievePayment(
    capture.payment_id,
  )
  const updatedPayment = await paymentService.capturePayment(capture)
  return new StepResponse<PaymentDTO, Payments>(updatedPayment, {
    originalPayment,
    updatedPayment,
  })
}

const createPaymentCaptureStepCompensate = async (
  payments: Record<string, PaymentDTO>,
  { container }: StepExecutionContext,
): Promise<StepResponse<Payments>> => {
  const { originalPayment, updatedPayment } = payments
  const originalCapturesSet = new Set(getCaptureIds(originalPayment))
  const updatedCaptureIds = getCaptureIds(updatedPayment)
  const capturesToDelete = updatedCaptureIds.filter(
    (captureId) => !originalCapturesSet.has(captureId),
  )
  const paymentService = container.resolve(Modules.PAYMENT)
  await paymentService.deleteCaptures(capturesToDelete)
  return new StepResponse<Payments>(payments)
}

const createPaymentCaptureStep = createStep(
  createPaymentCaptureStepId,
  createPaymentCaptureStepInvoke,
  createPaymentCaptureStepCompensate,
)

export default createPaymentCaptureStep

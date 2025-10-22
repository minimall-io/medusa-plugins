import { CaptureDTO, ModulesSdkTypes } from '@medusajs/framework/types'
import {
  StepExecutionContext,
  StepResponse,
  createStep,
} from '@medusajs/framework/workflows-sdk'

export const createPaymentCaptureStepId = 'create-payment-capture-step'

const createPaymentCaptureStepInvoke = async (
  capture: CaptureDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<CaptureDTO, CaptureDTO>> => {
  const captureService = container.resolve(
    'captureService',
  ) as ModulesSdkTypes.IMedusaInternalService<any>
  const newCapture = await captureService.create(capture)
  return new StepResponse<CaptureDTO, CaptureDTO>(newCapture, newCapture)
}

const createPaymentCaptureStepCompensate = async (
  createdCapture: CaptureDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<CaptureDTO>> => {
  const captureService = container.resolve(
    'captureService',
  ) as ModulesSdkTypes.IMedusaInternalService<any>
  await captureService.delete(createdCapture.id)
  return new StepResponse<CaptureDTO>(createdCapture)
}

const createPaymentCaptureStep = createStep(
  createPaymentCaptureStepId,
  createPaymentCaptureStepInvoke,
  createPaymentCaptureStepCompensate,
)

export default createPaymentCaptureStep

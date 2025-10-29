import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

export const errorTestStepId = 'error-test-step'

const errorTestStepInvoke = (): Promise<StepResponse<undefined, undefined>> => {
  throw new Error('Test error')
}

const errorTestStep = createStep(errorTestStepId, errorTestStepInvoke)

export default errorTestStep

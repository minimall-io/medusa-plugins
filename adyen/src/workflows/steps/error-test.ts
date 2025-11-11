import { MedusaError } from '@medusajs/framework/utils'

import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

export const errorTestStepId = 'error-test-step'

const errorTestStepInvoke = (message: string): Promise<StepResponse<undefined, undefined>> => {
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    message,
  )
}

const errorTestStep = createStep(errorTestStepId, errorTestStepInvoke)

export default errorTestStep

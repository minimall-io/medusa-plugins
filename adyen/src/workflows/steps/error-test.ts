import { MedusaError } from '@medusajs/framework/utils'
import { createStep } from '@medusajs/framework/workflows-sdk'

export const errorTestStepId = 'error-test-step'

const errorTestStepInvoke = (message: string) => {
  throw new MedusaError(MedusaError.Types.NOT_ALLOWED, message)
}

const errorTestStep = createStep(errorTestStepId, errorTestStepInvoke)

export default errorTestStep

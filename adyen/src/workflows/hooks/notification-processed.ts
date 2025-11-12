import { MedusaError } from '@medusajs/framework/utils'
import { processNotificationWorkflow, type WorkflowOutput } from '..'

processNotificationWorkflow.hooks.notificationProcessed(
  ({ payment }: WorkflowOutput) => {
    console.log(
      'processNotificationWorkflow/hooks/notificationProcessed/payment',
      JSON.stringify(payment, null, 2),
    )
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'processNotificationWorkflow/hooks/notificationProcessed/error',
    )
  },
)

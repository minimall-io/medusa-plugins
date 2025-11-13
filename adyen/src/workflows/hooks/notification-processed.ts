import type { Types } from '@adyen/api-library'
import { MedusaError } from '@medusajs/framework/utils'
import { processNotificationWorkflow } from '..'

type NotificationRequestItem = Types.notification.NotificationRequestItem

processNotificationWorkflow.hooks.notificationProcessed(
  (input: NotificationRequestItem) => {
    console.log(
      'processNotificationWorkflow/hooks/notificationProcessed/input',
      JSON.stringify(input, null, 2),
    )
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'processNotificationWorkflow/hooks/notificationProcessed/error',
    )
  },
)

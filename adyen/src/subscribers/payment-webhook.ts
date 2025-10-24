import { Types } from '@adyen/api-library'
import {
  IPaymentModuleService,
  ProviderWebhookPayload,
  WebhookActionResult,
} from '@medusajs/framework/types'
import {
  Modules,
  PaymentActions,
  PaymentWebhookEvents,
} from '@medusajs/framework/utils'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa/types'

import { processNotificationWorkflow } from '../workflows'

type SerializedBuffer = {
  data: ArrayBuffer
  type: 'Buffer'
}

interface WebhookActionData {
  session_id: string
  amount: number
  validNotifications?: Types.notification.NotificationRequestItem[]
  providerIdentifier?: string
}

interface AdyenWebhookActionResult extends WebhookActionResult {
  action: PaymentActions
  data?: WebhookActionData
}

export default async function paymentWebhookhandler({
  event,
  container,
}: SubscriberArgs<ProviderWebhookPayload>) {
  const paymentService: IPaymentModuleService = container.resolve(
    Modules.PAYMENT,
  )

  const input = event.data

  if (
    (input.payload?.rawData as unknown as SerializedBuffer)?.type === 'Buffer'
  ) {
    input.payload.rawData = Buffer.from(
      (input.payload.rawData as unknown as SerializedBuffer).data,
    )
  }

  const processedEvent = (await paymentService.getWebhookActionAndData(
    input,
  )) as AdyenWebhookActionResult

  if (processedEvent?.action !== PaymentActions.NOT_SUPPORTED) return
  if (!processedEvent.data) return
  if (!processedEvent.data.providerIdentifier) return
  if (!processedEvent.data.validNotifications) return
  if (processedEvent.data.providerIdentifier !== 'adyen') return

  const { validNotifications } = processedEvent.data

  console.log('paymentWebhookhandler/validNotifications', validNotifications)

  // await processPaymentWorkflow(container).run({ input: processedEvent })

  validNotifications.forEach((notification) => {
    processNotificationWorkflow(container).run({
      input: notification,
    })
  })
}

export const config: SubscriberConfig = {
  event: PaymentWebhookEvents.WebhookReceived,
  context: {
    subscriberId: 'adyen-payment-webhook-handler',
  },
}

import type { Types } from '@adyen/api-library'
import type {
  PaymentCollectionDTO,
  PaymentDTO,
  PaymentSessionDTO,
} from '@medusajs/framework/types'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export interface PaymentData {
  notification: NotificationRequestItem
  collection: PaymentCollectionDTO
  session: PaymentSessionDTO
  payment: PaymentDTO
}

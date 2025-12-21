import type { Types } from '@adyen/api-library'
import type {
  CaptureDTO,
  PaymentCollectionDTO,
  PaymentDTO,
  PaymentSessionDTO,
  RefundDTO,
} from '@medusajs/framework/types'

type NotificationRequestItem = Types.notification.NotificationRequestItem

export interface NotificationStepInput {
  notification: NotificationRequestItem
  collection: PaymentCollectionDTO
  session: PaymentSessionDTO
  payment: PaymentDTO
  captures: CaptureDTO[]
  refunds: RefundDTO[]
}

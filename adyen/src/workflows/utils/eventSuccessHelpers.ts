import { NotificationRequestItem, SuccessEnum } from './types'

export const isSuccess = (notification: NotificationRequestItem): boolean =>
  notification.success === SuccessEnum.True

export const isFailed = (notification: NotificationRequestItem): boolean =>
  notification.success === SuccessEnum.False

import type { Types } from '@adyen/api-library'
import type { PaymentDTO } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import {
  createStep,
  type StepExecutionContext,
  StepResponse,
} from '@medusajs/framework/workflows-sdk'

type NotificationRequestItem = Types.notification.NotificationRequestItem
type Notifications = Record<string, NotificationRequestItem>

export const addNotificationToPaymentDataStepId =
  'add-notification-to-payment-data-step'

const addNotificationToPaymentData = (
  notification: NotificationRequestItem,
  payment: PaymentDTO,
): PaymentDTO => {
  const { data } = payment
  const { pspReference } = notification
  const notifications = (data?.notifications as Notifications) || {}
  const newData = {
    ...data,
    notifications: { ...notifications, [pspReference]: notification },
  } as PaymentDTO['data']
  return { ...payment, data: newData }
}

const addNotificationToPaymentDataStepInvoke = async (
  notification: NotificationRequestItem,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO, PaymentDTO>> => {
  const { merchantReference } = notification
  const paymentService = container.resolve(Modules.PAYMENT)
  const [originalPayment] = await paymentService.listPayments({
    payment_session_id: merchantReference,
  })
  const newPayment = addNotificationToPaymentData(notification, originalPayment)
  const updatedPayment = await paymentService.updatePayment(newPayment)
  return new StepResponse<PaymentDTO, PaymentDTO>(
    updatedPayment,
    originalPayment,
  )
}

const addNotificationToPaymentDataStepCompensate = async (
  originalPayment: PaymentDTO,
  { container }: StepExecutionContext,
): Promise<StepResponse<PaymentDTO>> => {
  const paymentService = container.resolve(Modules.PAYMENT)
  const updatedPayment = await paymentService.updatePayment(originalPayment)
  return new StepResponse<PaymentDTO>(updatedPayment)
}

const addNotificationToPaymentDataStep = createStep(
  addNotificationToPaymentDataStepId,
  addNotificationToPaymentDataStepInvoke,
  addNotificationToPaymentDataStepCompensate,
)

export default addNotificationToPaymentDataStep

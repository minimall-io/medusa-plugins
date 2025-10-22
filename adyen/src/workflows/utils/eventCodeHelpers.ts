import { EventCodeEnum, type NotificationRequestItem } from './types'

export const isAutorescue = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.Autorescue

export const isAuthorisation = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.Authorisation

export const isAuthorisationAdjustment = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.AuthorisationAdjustment

export const isCancelAutorescue = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.CancelAutorescue

export const isCancellation = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.Cancellation

export const isCancelOrRefund = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.CancelOrRefund

export const isCapture = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.Capture

export const isCaptureFailed = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.CaptureFailed

export const isChargeback = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.Chargeback

export const isChargebackReversed = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.ChargebackReversed

export const isDisputeDefensePeriodEnded = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.DisputeDefensePeriodEnded

export const isDonation = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.Donation

export const isExpire = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.Expire

export const isHandledExternally = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.HandledExternally

export const isInformationSupplied = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.InformationSupplied

export const isIssuerComments = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.IssuerComments

export const isIssuerResponseTimeframeExpired = (
  notification: NotificationRequestItem,
): boolean =>
  notification.eventCode === EventCodeEnum.IssuerResponseTimeframeExpired

export const isManualReviewAccept = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.ManualReviewAccept

export const isManualReviewReject = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.ManualReviewReject

export const isNotificationOfChargeback = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.NotificationOfChargeback

export const isNotificationOfFraud = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.NotificationOfFraud

export const isOfferClosed = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.OfferClosed

export const isOrderClosed = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.OrderClosed

export const isOrderOpened = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.OrderOpened

export const isPaidoutReversed = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.PaidoutReversed

export const isPending = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.Pending

export const isPostponedRefund = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.PostponedRefund

export const isPrearbitrationLost = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.PrearbitrationLost

export const isPrearbitrationWon = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.PrearbitrationWon

export const isProcessRetry = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.ProcessRetry

export const isPayoutDecline = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.PayoutDecline

export const isPayoutExpire = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.PayoutExpire

export const isPayoutThirdparty = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.PayoutThirdparty

export const isRecurringContract = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.RecurringContract

export const isRefund = (notification: NotificationRequestItem): boolean =>
  notification.eventCode === EventCodeEnum.Refund

export const isRefundFailed = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.RefundFailed

export const isRefundedReversed = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.RefundedReversed

export const isRefundWithData = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.RefundWithData

export const isReportAvailable = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.ReportAvailable

export const isRequestForInformation = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.RequestForInformation

export const isSecondChargeback = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.SecondChargeback

export const isTechnicalCancel = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.TechnicalCancel

export const isVoidPendingRefund = (
  notification: NotificationRequestItem,
): boolean => notification.eventCode === EventCodeEnum.VoidPendingRefund

import type { HttpTypes } from '@medusajs/types'

export const getPendingSession = (
  collection: HttpTypes.StorePaymentCollection | undefined,
): HttpTypes.StorePaymentSession | undefined =>
  collection?.payment_sessions?.find((session) => session.status === 'pending')

export const getProviderSession = (
  collection: HttpTypes.StorePaymentCollection | undefined,
  providerId: string,
): HttpTypes.StorePaymentSession | undefined =>
  collection?.payment_sessions?.find(
    (session) => session.provider_id === providerId,
  )

export const getSession = (
  collection: HttpTypes.StorePaymentCollection | undefined,
  sessionId: string,
): HttpTypes.StorePaymentSession | undefined =>
  collection?.payment_sessions?.find((session) => session.id === sessionId)

import { HOST } from './constants'

export enum Operation {
  Any,
  PaymentMethods,
  Payments,
  Cancels,
  Captures,
  Refunds,
  StoredPaymentMethods,
}

const getURL = (uri: string): URL => new URL(uri, HOST)

export const getSegments = (uri: string): string[] => {
  const url = getURL(uri)
  const path = url.pathname
  return path.split('/').slice(2)
}

export const getSearchParams = (uri: string): URLSearchParams => {
  const url = getURL(uri)
  return url.searchParams
}

export const matchOperation =
  (filter: Operation) =>
  (uri: string): boolean => {
    const segments = getSegments(uri)
    if (segments.length === 0) return false
    const [operation, _, modification] = segments

    switch (filter) {
      case Operation.Any:
        return true
      case Operation.PaymentMethods:
        return operation === 'paymentMethods'
      case Operation.StoredPaymentMethods:
        return operation === 'storedPaymentMethods'
      case Operation.Payments:
        return operation === 'payments' && modification === undefined
      case Operation.Cancels:
        return operation === 'payments' && modification === 'cancels'
      case Operation.Captures:
        return operation === 'payments' && modification === 'captures'
      case Operation.Refunds:
        return operation === 'payments' && modification === 'refunds'
      default:
        return false
    }
  }

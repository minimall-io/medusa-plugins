import type { Data, Event } from '../../'

export const getEvent = (
  providerReference: Event['providerReference'],
  name: Event['name'] = 'AUTHORISATION',
  status: Event['status'] = 'REQUESTED',
  id: Event['id'] = 'id',
  merchantReference: Event['merchantReference'] = 'merchantReference',
  message: Event['message'] = 'message',
): Event => {
  const date = new Date().toISOString()
  return {
    amount: { currency: 'USD', value: 2995 },
    date,
    id,
    merchantReference,
    message,
    name,
    providerReference,
    status,
  }
}

export const getData = (
  reference: Data['reference'],
  events: Event[] = [],
  value: number = 2995,
  currency: string = 'USD',
): Data => {
  return {
    amount: { currency, value },
    events,
    reference,
  }
}

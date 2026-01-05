import { Types } from '@adyen/api-library'
import type { AddressDTO, PaymentCustomerDTO } from '@medusajs/framework/types'

type NotificationRequestItem = Types.notification.NotificationRequestItem
type EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum
type SuccessEnum = Types.notification.NotificationRequestItem.SuccessEnum
type CardDetails = Types.checkout.CardDetails
const TypeEnum = Types.checkout.CardDetails.TypeEnum

const adyenProviderId = process.env.ADYEN_PROVIDER_ID

export const getProviderId = (): string => `pp_adyen_${adyenProviderId}`

export const getCurrencyCode = (currency_code: string = 'usd'): string =>
  currency_code

export const getAmount = (
  amount?: number,
  minimum: number = 20,
  multiplier: number = 100,
  precision: number = 2,
): number =>
  amount ?? minimum + Number((Math.random() * multiplier).toFixed(precision))

export const getCustomer = (
  customerSuffix?: string,
  customerId?: string,
  customerEmail?: string,
  customerFirstName?: string,
  customerLastName?: string,
  customerCompanyName?: string,
  customerPhone?: string,
  customerBillingAddress?: AddressDTO,
): PaymentCustomerDTO => {
  const timestamp = Date.now()
  const suffix = customerSuffix || timestamp.toString()
  const id = customerId || `customer_${suffix}`
  const email = customerEmail || `email_${suffix}@minimall.io`
  const first_name = customerFirstName || `first_${suffix}`
  const last_name = customerLastName || `last_${suffix}`
  const company_name = customerCompanyName || `company_${suffix}`
  const phone = customerPhone || suffix.slice(0, 10)
  const billing_address = customerBillingAddress || { country_code: 'US' }
  return {
    billing_address,
    company_name,
    email,
    first_name,
    id,
    last_name,
    phone,
  }
}

export const getCardDetails = (
  encrypted: boolean = true,
  cardNumber: string = '4000060000000006',
  expiryMonth: string = '03',
  expiryYear: string = '2030',
  securityCode: string = '737',
  holderName: string = 'John Doe',
): CardDetails => {
  const encryptedCardDetails = {
    encryptedCardNumber: `test_${cardNumber}`,
    encryptedExpiryMonth: `test_${expiryMonth}`,
    encryptedExpiryYear: `test_${expiryYear}`,
    encryptedSecurityCode: `test_${securityCode}`,
    holderName: holderName,
    type: TypeEnum.Scheme,
  }

  const unencryptedCardDetails = {
    cvc: securityCode,
    expiryMonth: expiryMonth,
    expiryYear: expiryYear,
    holderName: holderName,
    number: cardNumber,
    type: TypeEnum.Scheme,
  }

  return encrypted ? encryptedCardDetails : unencryptedCardDetails
}

export const getNotificationRequestItem = (
  pspReference: string,
  merchantReference: string,
  amountValue: number,
  amountCurrency: string,
  eventCode: EventCodeEnum,
  success: SuccessEnum,
): NotificationRequestItem => {
  const eventDate = new Date().toISOString()
  const amount = {
    currency: amountCurrency,
    value: amountValue,
  }
  return {
    amount,
    eventCode,
    eventDate,
    merchantAccountCode: adyenProviderId!,
    merchantReference,
    pspReference,
    success,
  }
}

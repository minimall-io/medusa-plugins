import { Types } from '@adyen/api-library'
import { AddressDTO, PaymentCustomerDTO } from '@medusajs/framework/types'

export const getProviderId = (): string =>
  `pp_adyen_${process.env.ADYEN_PROVIDER_ID}`

export const getCurrencyCode = (currency_code: string = 'usd'): string =>
  currency_code

export const getAmount = (
  amount?: number,
  minimum: number = 20,
  multiplier: number = 100,
  precision: number = 2,
): number =>
  amount || minimum + Number((Math.random() * multiplier).toFixed(precision))

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
    id,
    email,
    phone,
    first_name,
    last_name,
    company_name,
    billing_address,
  }
}

export const getCardDetails = (
  cardNumber: string = '4000060000000006',
  expiryMonth: string = '03',
  expiryYear: string = '2030',
  securityCode: string = '737',
  holderName: string = 'John Doe',
): Types.checkout.CardDetails => {
  return {
    type: Types.checkout.CardDetails.TypeEnum.Scheme,
    encryptedCardNumber: `test_${cardNumber}`,
    encryptedExpiryMonth: `test_${expiryMonth}`,
    encryptedExpiryYear: `test_${expiryYear}`,
    encryptedSecurityCode: `test_${securityCode}`,
    holderName: holderName,
  }
}

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
  encrypted: boolean = true,
  cardNumber: string = '4000060000000006',
  expiryMonth: string = '03',
  expiryYear: string = '2030',
  securityCode: string = '737',
  holderName: string = 'John Doe',
): Types.checkout.CardDetails => {
  const encryptedCardDetails = {
    type: Types.checkout.CardDetails.TypeEnum.Scheme,
    encryptedCardNumber: `test_${cardNumber}`,
    encryptedExpiryMonth: `test_${expiryMonth}`,
    encryptedExpiryYear: `test_${expiryYear}`,
    encryptedSecurityCode: `test_${securityCode}`,
    holderName: holderName,
  }

  // const unencryptedCardDetails = {
  //   type: Types.checkout.CardDetails.TypeEnum.Scheme,
  //   number: `test_${cardNumber}`,
  //   expiryMonth: `test_${expiryMonth}`,
  //   expiryYear: `test_${expiryYear}`,
  //   cvc: `test_${securityCode}`,
  //   holderName: holderName,
  // }

  const unencryptedCardDetails = {
    type: Types.checkout.CardDetails.TypeEnum.Scheme,
    number: cardNumber,
    expiryMonth: expiryMonth,
    expiryYear: expiryYear,
    cvc: securityCode,
    holderName: holderName,
  }

  return encrypted ? encryptedCardDetails : unencryptedCardDetails
}

/**
savePaymentMethod/request {"paymentMethod":{"type":"scheme","number":"test_4000060000000006","expiryMonth":"test_03","expiryYear":"test_2030","cvc":"test_737","holderName":"John Doe"},"shopperReference":"customer_1762258527978","recurringProcessingModel":"CardOnFile","merchantAccount":"MinimallLLCECOM"}

savePaymentMethod/request {"paymentMethod":{"type":"scheme","number":"4000060000000006","expiryMonth":"03","expiryYear":"2030","cvc":"737","holderName":"John Doe"},"shopperReference":"customer_1762258674961","recurringProcessingModel":"CardOnFile","merchantAccount":"MinimallLLCECOM"}

savePaymentMethod/request {"paymentMethod":{"type":"scheme","encryptedCardNumber":"test_4000060000000006","encryptedExpiryMonth":"test_03","encryptedExpiryYear":"test_2030","encryptedSecurityCode":"test_737","holderName":"John Doe"},"shopperReference":"customer_1762258731675","recurringProcessingModel":"CardOnFile","merchantAccount":"MinimallLLCECOM"}

const checkout = new CheckoutAPI(client);
const response = await checkout.RecurringApi.storedPaymentMethods(request)
 */

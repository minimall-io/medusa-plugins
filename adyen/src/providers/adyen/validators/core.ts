import { Types } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import { z } from 'zod'

export const StringDateUnionSchema = z.union([z.string(), z.date()])

export const StringNumberUnion = z.union([z.string(), z.number()])

export const StringArraySchema = z.array(z.string())

export const NumberArraySchema = z.array(z.number())

export const UnknownArraySchema = z.array(z.unknown())

export const StringRecordSchema = z.record(z.string(), z.string())

export const AnyRecordSchema = z.record(z.string(), z.any())

export const UnknownRecordSchema = z.record(z.string(), z.unknown())

export const EnvironmentEnumSchema = z.nativeEnum(EnvironmentEnum)

export const StatusEnumSchema = z.nativeEnum(
  Types.checkout.SessionResultResponse.StatusEnum,
)

export const PaymentResultCodeEnumSchema = z.nativeEnum(
  Types.checkout.Payment.ResultCodeEnum,
)

export const PaymentResponseResultCodeEnumSchema = z.nativeEnum(
  Types.checkout.PaymentResponse.ResultCodeEnum,
)

export const ChannelEnumSchema = z.nativeEnum(
  Types.checkout.CreateCheckoutSessionRequest.ChannelEnum,
)

export const ModeEnumSchema = z.nativeEnum(
  Types.checkout.CreateCheckoutSessionRequest.ModeEnum,
)

export const RecurringProcessingModelEnumSchema = z.nativeEnum(
  Types.checkout.CreateCheckoutSessionRequest.RecurringProcessingModelEnum,
)

export const ShopperInteractionEnumSchema = z.nativeEnum(
  Types.checkout.CreateCheckoutSessionRequest.ShopperInteractionEnum,
)

export const StoreFiltrationModeEnumSchema = z.nativeEnum(
  Types.checkout.CreateCheckoutSessionRequest.StoreFiltrationModeEnum,
)

export const StorePaymentMethodModeEnumSchema = z.nativeEnum(
  Types.checkout.CreateCheckoutSessionRequest.StorePaymentMethodModeEnum,
)

export const AccountAgeIndicatorEnumSchema = z.nativeEnum(
  Types.checkout.AccountInfo.AccountAgeIndicatorEnum,
)

export const AccountChangeIndicatorEnumSchema = z.nativeEnum(
  Types.checkout.AccountInfo.AccountChangeIndicatorEnum,
)

export const AccountTypeEnumSchema = z.nativeEnum(
  Types.checkout.AccountInfo.AccountTypeEnum,
)

export const DeliveryAddressUsageIndicatorEnumSchema = z.nativeEnum(
  Types.checkout.AccountInfo.DeliveryAddressUsageIndicatorEnum,
)

export const PasswordChangeIndicatorEnumSchema = z.nativeEnum(
  Types.checkout.AccountInfo.PasswordChangeIndicatorEnum,
)

export const PaymentAccountIndicatorEnumSchema = z.nativeEnum(
  Types.checkout.AccountInfo.PaymentAccountIndicatorEnum,
)

export const AttemptAuthenticationEnumSchema = z.nativeEnum(
  Types.checkout.AuthenticationData.AttemptAuthenticationEnum,
)

export const ChallengeWindowSizeEnumSchema = z.nativeEnum(
  Types.checkout.ThreeDSRequestData.ChallengeWindowSizeEnum,
)

export const DataOnlyEnumSchema = z.nativeEnum(
  Types.checkout.ThreeDSRequestData.DataOnlyEnum,
)

export const NativeThreeDSEnumSchema = z.nativeEnum(
  Types.checkout.ThreeDSRequestData.NativeThreeDSEnum,
)

export const ThreeDSVersionEnumSchema = z.nativeEnum(
  Types.checkout.ThreeDSRequestData.ThreeDSVersionEnum,
)

export const ThreeDSRequestorChallengeIndEnumSchema = z.nativeEnum(
  Types.checkout.CheckoutSessionThreeDS2RequestData
    .ThreeDSRequestorChallengeIndEnum,
)

export const AmountRuleEnumSchema = z.nativeEnum(
  Types.checkout.Mandate.AmountRuleEnum,
)

export const BillingAttemptsRuleEnumSchema = z.nativeEnum(
  Types.checkout.Mandate.BillingAttemptsRuleEnum,
)

export const FrequencyEnumSchema = z.nativeEnum(
  Types.checkout.Mandate.FrequencyEnum,
)

export const AuthenticationResponseEnumSchema = z.nativeEnum(
  Types.checkout.ThreeDSecureData.AuthenticationResponseEnum,
)

export const ChallengeCancelEnumSchema = z.nativeEnum(
  Types.checkout.ThreeDSecureData.ChallengeCancelEnum,
)

export const DirectoryResponseEnumSchema = z.nativeEnum(
  Types.checkout.ThreeDSecureData.DirectoryResponseEnum,
)

export const BehaviorEnumSchema = z.nativeEnum(
  Types.checkout.PlatformChargebackLogic.BehaviorEnum,
)

export const PlansEnumSchema = z.nativeEnum(
  Types.checkout.CheckoutSessionInstallmentOption.PlansEnum,
)

export const FundingSourceEnumSchema = z.nativeEnum(
  Types.checkout.CardDetails.FundingSourceEnum,
)

export const CardDetailsTypeEnumSchema = z.nativeEnum(
  Types.checkout.CardDetails.TypeEnum,
)

export const WalletPurposeEnumSchema = z.nativeEnum(
  Types.checkout.FundRecipient.WalletPurposeEnum,
)

export const SplitTypeEnumSchema = z.nativeEnum(Types.checkout.Split.TypeEnum)

export const AmountSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  value: z.number(),
})

export const AddressSchema = z.object({
  city: z.string(),
  country: z.string(),
  houseNumberOrName: z.string(),
  postalCode: z.string(),
  stateOrProvince: z.string().optional(),
  street: z.string(),
})

export const BillingAddressSchema = AddressSchema

export const NameSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
})

export const DeliveryAddressSchema = AddressSchema.merge(NameSchema.partial())

export const PhoneSchema = z.object({
  cc: z.string().optional(),
  subscriber: z.string().optional(),
})

export const CompanySchema = z.object({
  homepage: z.string().optional(),
  name: z.string().optional(),
  registrationNumber: z.string().optional(),
  registryLocation: z.string().optional(),
  taxId: z.string().optional(),
  type: z.string().optional(),
})

export const SplitAmountSchema = z.object({
  currency: z.string().length(3).toUpperCase().optional(),
  value: z.number(),
})

export const CommonFieldSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
})

export const ExternalPlatformSchema = z.object({
  integrator: z.string().optional(),
  name: z.string().optional(),
  version: z.string().optional(),
})

export const MerchantDeviceSchema = z.object({
  os: z.string().optional(),
  osVersion: z.string().optional(),
  reference: z.string().optional(),
})

export const ShopperInteractionDevice = z.object({
  locale: z.string().optional(),
  os: z.string().optional(),
  osVersion: z.string().optional(),
})

export const RiskDataSchema = z.object({
  clientData: z.string().optional(),
  customFields: StringRecordSchema.optional(),
  fraudOffset: z.number().optional(),
  profileReference: z.string().optional(),
})

export const SubMerchantSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  mcc: z.string().optional(),
  name: z.string().optional(),
  taxId: z.string().optional(),
})

export const CardDetailsSchema = z.object({
  brand: z.string().optional(),
  checkoutAttemptId: z.string().optional(),
  cupsecureplus_smscode: z.string().optional(),
  cvc: z.string().optional(),
  encryptedCard: z.string().optional(),
  encryptedCardNumber: z.string().optional(),
  encryptedExpiryMonth: z.string().optional(),
  encryptedExpiryYear: z.string().optional(),
  encryptedSecurityCode: z.string().optional(),
  expiryMonth: z.string().optional(),
  expiryYear: z.string().optional(),
  fastlaneData: z.string().optional(),
  fundingSource: FundingSourceEnumSchema.optional(),
  holderName: z.string().optional(),
  networkPaymentReference: z.string().optional(),
  number: z.string().optional(),
  recurringDetailReference: z.string().optional(),
  shopperNotificationReference: z.string().optional(),
  srcCorrelationId: z.string().optional(),
  srcDigitalCardId: z.string().optional(),
  srcScheme: z.string().optional(),
  srcTokenReference: z.string().optional(),
  storedPaymentMethodId: z.string().optional(),
  threeDS2SdkVersion: z.string().optional(),
  type: CardDetailsTypeEnumSchema.optional(),
})

export const ThreeDSRequestDataSchema = z.object({
  challengeWindowSize: ChallengeWindowSizeEnumSchema.optional(),
  dataOnly: DataOnlyEnumSchema.optional(),
  nativeThreeDS: NativeThreeDSEnumSchema.optional(),
  threeDSVersion: ThreeDSVersionEnumSchema.optional(),
})

export const AccountInfoSchema = z.object({
  accountAgeIndicator: AccountAgeIndicatorEnumSchema.optional(),
  accountChangeDate: z.date().optional(),
  accountChangeIndicator: AccountChangeIndicatorEnumSchema.optional(),
  accountCreationDate: z.date().optional(),
  accountType: AccountTypeEnumSchema.optional(),
  addCardAttemptsDay: z.number().optional(),
  deliveryAddressUsageDate: z.date().optional(),
  deliveryAddressUsageIndicator:
    DeliveryAddressUsageIndicatorEnumSchema.optional(),
  passwordChangeDate: z.date().optional(),
  passwordChangeIndicator: PasswordChangeIndicatorEnumSchema.optional(),
  pastTransactionsDay: z.number().optional(),
  pastTransactionsYear: z.number().optional(),
  paymentAccountAge: z.date().optional(),
  paymentAccountIndicator: PaymentAccountIndicatorEnumSchema.optional(),
  purchasesLast6Months: z.number().optional(),
  suspiciousActivity: z.boolean().optional(),
})

export const ApplicationInfo = z.object({
  adyenLibrary: CommonFieldSchema.optional().nullable(),
  adyenPaymentSource: CommonFieldSchema.optional().nullable(),
  externalPlatform: ExternalPlatformSchema.optional().nullable(),
  merchantApplication: CommonFieldSchema.optional().nullable(),
  merchantDevice: MerchantDeviceSchema.optional().nullable(),
  shopperInteractionDevice: ShopperInteractionDevice.optional().nullable(),
})

export const AuthenticationDataSchema = z.object({
  attemptAuthentication: AttemptAuthenticationEnumSchema.optional(),
  authenticationOnly: z.boolean().optional(),
  threeDSRequestData: ThreeDSRequestDataSchema.optional().nullable(),
})

export const FundOriginSchema = z.object({
  billingAddress: AddressSchema.optional().nullable(),
  shopperEmail: z.string().optional(),
  shopperName: NameSchema.optional().nullable(),
  telephoneNumber: z.string().optional(),
  walletIdentifier: z.string().optional(),
})

export const FundRecipientSchema = z.object({
  IBAN: z.string().optional(),
  billingAddress: AddressSchema.optional().nullable(),
  paymentMethod: CardDetailsSchema.optional().nullable(),
  shopperEmail: z.string().optional(),
  shopperName: NameSchema.optional().nullable(),
  shopperReference: z.string().optional(),
  storedPaymentMethodId: z.string().optional(),
  subMerchant: SubMerchantSchema.optional().nullable(),
  telephoneNumber: z.string().optional(),
  walletIdentifier: z.string().optional(),
  walletOwnerTaxId: z.string().optional(),
  walletPurpose: WalletPurposeEnumSchema.optional(),
})

export const CheckoutSessionInstallmentOptionSchema = z.object({
  plans: z.array(PlansEnumSchema).optional(),
  preselectedValue: z.number().optional(),
  values: NumberArraySchema.optional(),
})

export const InstallmentOptionsSchema = z.record(
  z.string(),
  CheckoutSessionInstallmentOptionSchema,
)

export const LineItemSchema = z.object({
  amountExcludingTax: z.number().optional(),
  amountIncludingTax: z.number().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  id: z.string().optional(),
  imageUrl: z.string().optional(),
  itemCategory: z.string().optional(),
  manufacturer: z.string().optional(),
  marketplaceSellerId: z.string().optional(),
  productUrl: z.string().optional(),
  quantity: z.number().optional(),
  receiverEmail: z.string().optional(),
  size: z.string().optional(),
  sku: z.string().optional(),
  taxAmount: z.number().optional(),
  taxPercentage: z.number().optional(),
  upc: z.string().optional(),
})

export const MandateSchema = z.object({
  amount: z.string(),
  amountRule: AmountRuleEnumSchema.optional(),
  billingAttemptsRule: BillingAttemptsRuleEnumSchema.optional(),
  billingDay: z.string().optional(),
  count: z.string().optional(),
  endsAt: z.string(),
  frequency: FrequencyEnumSchema,
  remarks: z.string().optional(),
  startsAt: z.string().optional(),
})

export const ThreeDSecureDataSchema = z.object({
  authenticationResponse: AuthenticationResponseEnumSchema.optional(),
  cavv: z.string().optional(),
  cavvAlgorithm: z.string().optional(),
  challengeCancel: ChallengeCancelEnumSchema.optional(),
  directoryResponse: DirectoryResponseEnumSchema.optional(),
  dsTransID: z.string().optional(),
  eci: z.string().optional(),
  riskScore: z.string().optional(),
  threeDSVersion: z.string().optional(),
  tokenAuthenticationVerificationValue: z.string().optional(),
  transStatusReason: z.string().optional(),
  xid: z.string().optional(),
})

export const PlatformChargebackLogicSchema = z.object({
  behavior: BehaviorEnumSchema.optional(),
  costAllocationAccount: z.string().optional(),
  targetAccount: z.string().optional(),
})

export const SplitSchema = z.object({
  account: z.string().optional(),
  amount: SplitAmountSchema.optional().nullable(),
  description: z.string().optional(),
  reference: z.string().optional(),
  type: SplitTypeEnumSchema,
})

export const CheckoutSessionThreeDS2RequestDataSchema = z.object({
  homePhone: PhoneSchema.optional().nullable(),
  mobilePhone: PhoneSchema.optional().nullable(),
  threeDSRequestorChallengeInd:
    ThreeDSRequestorChallengeIndEnumSchema.optional(),
  workPhone: PhoneSchema.optional().nullable(),
})

export const CheckoutSessionSchema = z.object({
  accountInfo: AccountInfoSchema.optional().nullable(),
  additionalAmount: AmountSchema.optional().nullable(),
  additionalData: StringRecordSchema.optional(),
  allowedPaymentMethods: StringArraySchema.optional(),
  amount: AmountSchema,
  applicationInfo: ApplicationInfo.optional().nullable(),
  authenticationData: AuthenticationDataSchema.optional().nullable(),
  billingAddress: BillingAddressSchema.optional().nullable(),
  blockedPaymentMethods: StringArraySchema.optional(),
  captureDelayHours: z.number().optional(),
  channel: ChannelEnumSchema.optional(),
  company: CompanySchema.optional().nullable(),
  countryCode: z.string().optional(),
  dateOfBirth: z.date().optional(),
  deliverAt: z.date().optional(),
  deliveryAddress: DeliveryAddressSchema.optional().nullable(),
  enableOneClick: z.boolean().optional(),
  enablePayOut: z.boolean().optional(),
  enableRecurring: z.boolean().optional(),
  expiresAt: z.date(),
  fundOrigin: FundOriginSchema.optional().nullable(),
  fundRecipient: FundRecipientSchema.optional().nullable(),
  id: z.string(),
  installmentOptions: InstallmentOptionsSchema.optional(),
  lineItems: z.array(LineItemSchema).optional(),
  mandate: MandateSchema.optional().nullable(),
  mcc: z.string().optional(),
  merchantAccount: z.string(),
  merchantOrderReference: z.string().optional(),
  metadata: StringRecordSchema.optional(),
  mode: ModeEnumSchema.optional(),
  mpiData: ThreeDSecureDataSchema.optional().nullable(),
  platformChargebackLogic: PlatformChargebackLogicSchema.optional().nullable(),
  recurringExpiry: z.string().optional(),
  recurringFrequency: z.string().optional(),
  recurringProcessingModel: RecurringProcessingModelEnumSchema.optional(),
  redirectFromIssuerMethod: z.string().optional(),
  redirectToIssuerMethod: z.string().optional(),
  reference: z.string(),
  returnUrl: z.string(),
  riskData: RiskDataSchema.optional().nullable(),
  sessionData: z.string().optional(),
  shopperEmail: z.string().optional(),
  shopperIP: z.string().optional(),
  shopperInteraction: ShopperInteractionEnumSchema.optional(),
  shopperLocale: z.string().optional(),
  shopperName: NameSchema.optional().nullable(),
  shopperReference: z.string().optional(),
  shopperStatement: z.string().optional(),
  showInstallmentAmount: z.boolean().optional(),
  showRemovePaymentMethodButton: z.boolean().optional(),
  socialSecurityNumber: z.string().optional(),
  splitCardFundingSources: z.boolean().optional(),
  splits: z.array(SplitSchema).optional(),
  store: z.string().optional(),
  storeFiltrationMode: StoreFiltrationModeEnumSchema.optional(),
  storePaymentMethod: z.boolean().optional(),
  storePaymentMethodMode: StorePaymentMethodModeEnumSchema.optional(),
  telephoneNumber: z.string().optional(),
  themeId: z.string().optional(),
  threeDS2RequestData:
    CheckoutSessionThreeDS2RequestDataSchema.optional().nullable(),
  trustedShopper: z.boolean().optional(),
  url: z.string().optional(),
})

export const ResponsePaymentMethodSchema = z.object({
  brand: z.string().optional(),
  type: z.string().optional(),
})

export const PaymentSchema = z.object({
  amount: AmountSchema.optional().nullable(),
  paymentMethod: ResponsePaymentMethodSchema.optional().nullable(),
  pspReference: z.string().optional(),
  resultCode: PaymentResultCodeEnumSchema.optional(),
})

export const AuthorizationSchema = z.object({
  additionalData: StringRecordSchema.optional(),
  id: z.string().optional(),
  payments: z.array(PaymentSchema).optional(),
  reference: z.string().optional(),
  status: StatusEnumSchema.optional(),
})

export const SessionsResponseSchema = z.object({
  sessionId: z.string(),
  sessionData: z.string(),
  sessionResult: z.string(),
  resultCode: PaymentResponseResultCodeEnumSchema,
})

export const PaymentMethodToStoreSchema = z.object({
  brand: z.string().optional(),
  cvc: z.string().optional(),
  encryptedCard: z.string().optional(),
  encryptedCardNumber: z.string().optional(),
  encryptedExpiryMonth: z.string().optional(),
  encryptedExpiryYear: z.string().optional(),
  encryptedSecurityCode: z.string().optional(),
  expiryMonth: z.string().optional(),
  expiryYear: z.string().optional(),
  holderName: z.string().optional(),
  number: z.string().optional(),
  type: z.string().optional(),
})

export const AddressDTOSchema = z.object({
  id: z.string().optional(),
  address_1: z.string(),
  address_2: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  country_code: z.string(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  metadata: UnknownRecordSchema.optional().nullable(),
  created_at: StringDateUnionSchema.optional(),
  updated_at: StringDateUnionSchema.optional(),
  deleted_at: StringDateUnionSchema.optional().nullable(),
})

export const PaymentCustomerDTOSchema = z.object({
  id: z.string(),
  email: z.string(),
  company_name: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  billing_address: AddressDTOSchema.partial().optional().nullable(),
})

export const AccountHolderDTOSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  external_id: z.string(),
  email: z.string().optional().nullable(),
  data: UnknownRecordSchema,
  created_at: StringDateUnionSchema.optional().nullable(),
  updated_at: StringDateUnionSchema.optional().nullable(),
  metadata: UnknownRecordSchema.optional().nullable(),
})

export const PaymentProviderContextSchema = z.object({
  idempotency_key: z.string(),
  customer: PaymentCustomerDTOSchema,
  account_holder: AccountHolderDTOSchema,
})

export const PaymentModificationSchema = z.object({
  pspReference: z.string(),
  reference: z.string(),
  status: z.string(),
  amount: AmountSchema,
  id: z.string(),
})

export const PaymentModificationsSchema = z.record(
  z.string(),
  PaymentModificationSchema,
)

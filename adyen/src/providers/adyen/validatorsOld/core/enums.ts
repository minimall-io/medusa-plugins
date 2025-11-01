import { Types } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import { z } from 'zod'

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
  Types.checkout.StoredPaymentMethodRequest.RecurringProcessingModelEnum,
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

export const PlanEnumSchema = z.nativeEnum(Types.checkout.Installments.PlanEnum)

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

export const CheckoutBankAccountTypeEnumSchema = z.nativeEnum(
  Types.checkout.CheckoutBankAccount.AccountTypeEnum,
)

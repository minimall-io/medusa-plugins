import { CheckoutAPI, Client, Types } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CreateAccountHolderInput,
  CreateAccountHolderOutput,
  DeleteAccountHolderInput,
  DeleteAccountHolderOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ListPaymentMethodsInput,
  Logger,
  PaymentProviderInput,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  SavePaymentMethodInput,
  SavePaymentMethodOutput,
  UpdateAccountHolderInput,
  UpdateAccountHolderOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from '@medusajs/framework/types'
import {
  AbstractPaymentProvider,
  MedusaError,
  isDefined,
} from '@medusajs/framework/utils'

interface Options {
  apiKey: string
  merchantAccount: string
  environment?: EnvironmentEnum
}

interface InjectedDependencies extends Record<string, unknown> {
  logger: Logger
}

const ADYEN = 'Adyen payment provider'

class AdyenProviderService extends AbstractPaymentProvider<Options> {
  static readonly identifier: string = 'adyen'
  protected readonly options_: Options
  protected logger_: Logger
  protected client: Client
  protected checkoutAPI: CheckoutAPI

  private log(title: string, data: any) {
    const message = `${title}: ${JSON.stringify(data, null, 2)}`
    console.log(message)
    // this.logger_.info(message)
  }

  private resolvePaymentSessionStatus(
    code?: Types.checkout.PaymentResponse.ResultCodeEnum,
  ): PaymentSessionStatus {
    const Codes = Types.checkout.PaymentResponse.ResultCodeEnum
    switch (code) {
      case undefined:
        return 'error'
      case Codes.AuthenticationFinished:
      case Codes.AuthenticationNotRequired:
      case Codes.Authorised:
        return 'authorized'
      case Codes.Cancelled:
        return 'canceled'
      case Codes.ChallengeShopper:
        return 'requires_more'
      case Codes.Error:
        return 'error'
      case Codes.IdentifyShopper:
        return 'requires_more'
      case Codes.PartiallyAuthorised:
        return 'authorized'
      case Codes.Pending:
        return 'pending'
      case Codes.PresentToShopper:
        return 'requires_more'
      case Codes.Received:
        return 'pending'
      case Codes.RedirectShopper:
        return 'requires_more'
      case Codes.Refused:
        return 'error'
      case Codes.Success:
        return 'captured'
      default:
        return 'error' // Default to error for unhandled cases
    }
  }

  private formatAmount(currency: string, value: number) {
    const amount: Types.checkout.Amount = {
      currency,
      value,
    }
    return amount
  }

  private formatData(input?: PaymentProviderInput) {
    const result: Partial<Types.checkout.PaymentMethodsRequest> = {}

    if (!isDefined(input)) return result

    const { data } = input
    if (data?.countryCode) result.countryCode = data.countryCode as string
    if (data?.shopperLocale) result.shopperLocale = data.shopperLocale as string

    return result
  }

  static validateOptions(options: Options): void {
    const { apiKey, merchantAccount } = options

    if (!isDefined<string>(apiKey)) {
      const errorMessage = `${ADYEN} API key is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }

    if (!isDefined<string>(merchantAccount)) {
      const errorMessage = `${ADYEN} merchant account is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }
  }

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options

    const { apiKey, environment } = options
    const defaultEnvironment = !isDefined<EnvironmentEnum | undefined>(
      environment,
    )
      ? EnvironmentEnum.TEST
      : EnvironmentEnum.LIVE

    this.client = new Client({ apiKey, environment: defaultEnvironment })
    this.checkoutAPI = new CheckoutAPI(this.client)
  }

  /**
   ****** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST.PaymentWebhookEvents.WebhookReceived
   ***** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   **** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.authorizePayment
   *
   ***** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   **** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.authorizePayment
   *
   ***** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.authorizePayment
   */
  public async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    this.log('authorizePayment', input)

    // const request: Types.checkout.PaymentRequest = {
    //   merchantAccount: this.options_.merchantAccount,
    //   reference: '',
    //   amount: {
    //     currency: '',
    //     value: 0,
    //   },
    //   paymentMethod: {},
    //   returnUrl: '',
    // }
    // const options = { idempotencyKey: 'UUID' }

    // const response = await this.checkoutAPI.PaymentsApi.payments(
    //   request,
    //   options,
    // )
    // const { resultCode } = response
    // const status = this.resolvePaymentSessionStatus(resultCode)

    return { status: 'authorized' }
  }

  /**
   ******* packages/medusa/src/api/admin/returns/[id]/request/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/return/confirm-return-request.ts:confirmReturnRequestWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/returns/[id]/receive/confirm/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/return/confirm-receive-return-request.ts:confirmReturnReceiveWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/order-edits/[id]/confirm/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/order-edit/confirm-order-edit-request.ts:confirmOrderEditRequestWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/exchanges/[id]/request/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/exchange/confirm-exchange-request.ts:confirmExchangeRequestWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/claims/[id]/request/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/claim/confirm-claim-request.ts:confirmClaimRequestWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/draft-orders/[id]/edit/request/route.ts:POST
   ****** packages/core/core-flows/src/draft-order/workflows/request-draft-order-edit.ts:requestDraftOrderEditWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ******* packages/medusa/src/api/admin/draft-orders/[id]/edit/confirm/route.ts:POST
   ****** packages/core/core-flows/src/draft-order/workflows/confirm-draft-order-edit.ts:confirmDraftOrderEditWorkflow
   ***** packages/core/core-flows/src/order/workflows/create-or-update-order-payment-collection.ts:createOrUpdateOrderPaymentCollectionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/cancel-payment-collection.ts:cancelPaymentCollectionWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/admin/orders/[id]/cancel/route.ts:POST
   **** packages/core/core-flows/src/order/workflows/cancel-order.ts:cancelOrderWorkflow
   *** packages/core/core-flows/src/payment/steps/cancel-payment.ts:cancelPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   * ****** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST.PaymentWebhookEvents.WebhookReceived
   ***** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   **** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   **** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.cancelPayment
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   * ****** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST.PaymentWebhookEvents.WebhookReceived
   ***** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   **** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   **** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   *
   ***** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   **** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   *** packages/core/core-flows/src/payment/steps/authorize-payment-session.ts:authorizePaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.authorizePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.cancelPayment
   */
  public async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    // TODO: Implement cancelPayment logic
    this.log('cancelPayment', input)
    return {}
  }

  /**
   ******* packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST.PaymentWebhookEvents.WebhookReceived
   ****** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ***** packages/core/core-flows/src/payment/workflows/process-payment.ts:processPaymentWorkflow
   **** packages/core/core-flows/src/payment/workflows/capture-payment.ts:capturePaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/capture-payment.ts:capturePaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:capturePayment
   * packages/modules/payment/src/services/payment-provider.ts:capturePayment
   *
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment/workflows/capture-payment.ts:capturePaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/capture-payment.ts:capturePaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:capturePayment
   * packages/modules/payment/src/services/payment-provider.ts:capturePayment
   *
   ***** packages/medusa/src/api/admin/payments/[id]/capture/route.ts:POST
   **** packages/core/core-flows/src/payment/workflows/capture-payment.ts:capturePaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/capture-payment.ts:capturePaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:capturePayment
   * packages/modules/payment/src/services/payment-provider.ts:capturePayment
   */
  public async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    this.log('capturePayment', input)
    // TODO: Implement capturePayment logic
    return {}
  }

  /**
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:createAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:createAccountHolder
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:createAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:createAccountHolder
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:createAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:createAccountHolder
   */
  public async createAccountHolder(
    input: CreateAccountHolderInput,
  ): Promise<CreateAccountHolderOutput> {
    this.log('createAccountHolder', input)
    // TODO: Implement createAccountHolder logic
    return { id: '' }
  }

  /**
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:deleteAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:deleteAccountHolder
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:deleteAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:deleteAccountHolder
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-account-holder.ts:createPaymentAccountHolderStep
   ** packages/modules/payment/src/services/payment-module.ts:deleteAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:deleteAccountHolder
   */
  public async deleteAccountHolder(
    input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    this.log('deleteAccountHolder', input)
    // TODO: Implement createAccountHolder logic
    return {}
  }

  /**
   *
   * Unfinished!!!
   *
   *******
   ****** packages/core/core-flows/src/cart/workflows/refresh-cart-items.ts:refreshCartItemsWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:deleteSession
   *
   ******* packages/medusa/src/api/store/carts/route.ts:POST
   ****** packages/core/core-flows/src/cart/workflows/create-carts.ts:createCartWorkflow
   ***** packages/core/core-flows/src/cart/workflows/refresh-payment-collection.ts:refreshPaymentCollectionForCartWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:deleteSession
   *
   *
   ******* packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:deleteSession
   *
   ********* packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******** packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ******* packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ****** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:deleteSession
   *
   ****** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   ***** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:deleteSession
   *
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:deleteSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:deleteSession
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:deleteSession
   */
  public async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    this.log('deletePayment', input)
    // TODO: Implement deletePayment logic
    return {}
  }

  /**
   * We don't see this method being used anywhere.
   * Are these assumptions correct?
   *
   * packages/modules/payment/src/services/payment-provider.ts:getStatus
   */
  public async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    this.log('getPaymentStatus', input)
    // TODO: Implement getPaymentStatus logic
    return { status: 'pending' }
  }

  /**
   **** packages/medusa/src/api/hooks/payment/[provider]/route.ts:POST
   *** PaymentWebhookEvents.WebhookReceived:packages/medusa/src/subscribers/payment-webhook.ts:paymentWebhookhandler
   ** packages/modules/payment/src/services/payment-module.ts:getWebhookActionAndData
   * packages/modules/payment/src/services/payment-provider.ts:getWebhookActionAndData
   */
  public async getWebhookActionAndData(
    input: ProviderWebhookPayload['payload'],
  ): Promise<WebhookActionResult> {
    this.log('getWebhookActionAndData', input)
    // TODO: Implement getWebhookActionAndData logic
    return { action: 'not_supported' }
  }

  /**
   *
   * Unfinished!!!
   *
   **** packages/core/core-flows/src/payment-collection/workflows/delete-payment-sessions.ts:deletePaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/delete-payment-sessions.ts:deletePaymentSessionsStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:createSession
   *
   ****** packages/medusa/src/api/admin/payment-collections/[id]/mark-as-paid/route.ts:POST
   ***** packages/core/core-flows/src/order/workflows/mark-payment-collection-as-paid.ts:markPaymentCollectionAsPaid
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:createSession
   *
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:createSession
   *
   ***** packages/medusa/src/api/store/payment-collections/[id]/payment-sessions/route.ts:POST
   **** packages/core/core-flows/src/payment-collection/workflows/create-payment-session.ts:createPaymentSessionsWorkflow
   *** packages/core/core-flows/src/payment-collection/steps/create-payment-session.ts:createPaymentSessionStep
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:createSession
   */
  public async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    this.log('initiatePayment', input)
    const id = input.data?.session_id as string
    const status = input.data?.status as PaymentSessionStatus
    const { currency_code, amount } = input
    const data = { currency_code, amount, ...input.data }
    return { id, status, data }
  }

  /**
   * We don't see this method being used beyond the Payment Module.
   * Are these assumptions correct?
   *
   ** packages/modules/payment/src/services/payment-module.ts:listAndCountPaymentMethods
   * packages/modules/payment/src/services/payment-provider.ts:listPaymentMethods
   *
   ** packages/modules/payment/src/services/payment-module.ts:listPaymentMethods
   * packages/modules/payment/src/services/payment-provider.ts:listPaymentMethods
   */
  public async listPaymentMethods(input: ListPaymentMethodsInput) {
    this.log('listPaymentMethods', input)
    const { data } = input
    const amount = this.formatAmount(
      data?.currency_code as string,
      data?.amount as number,
    )
    const { countryCode, shopperLocale } = this.formatData(data)
    const request: Types.checkout.PaymentMethodsRequest = {
      merchantAccount: this.options_.merchantAccount,
      countryCode,
      shopperLocale,
      amount,
    }
    const options = { idempotencyKey: 'UUID' }

    const response = await this.checkoutAPI.PaymentsApi.paymentMethods(
      request,
      options,
    )
    const { paymentMethods, storedPaymentMethods } = response
    return { paymentMethods, storedPaymentMethods }
  }

  /**
   ******** packages/medusa/src/api/store/carts/[id]/complete/route.ts:POST
   ******* packages/core/core-flows/src/cart/workflows/complete-cart.ts:completeCartWorkflow
   ****** packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts:compensatePaymentIfNeededStep
   ***** packages/core/core-flows/src/cart/workflows/refund-payment-recreate-payment-session.ts:refundPaymentAndRecreatePaymentSessionWorkflow
   **** packages/core/core-flows/src/payment/workflows/refund-payments.ts:refundPaymentsWorkflow
   *** packages/core/core-flows/src/payment/steps/refund-payments.ts:refundPaymentsStep
   ** packages/modules/payment/src/services/payment-module.ts:refundPayment
   * packages/modules/payment/src/services/payment-provider.ts:refundPayment
   *
   ******* packages/medusa/src/api/admin/orders/[id]/cancel/route.ts:POST
   ****** packages/core/core-flows/src/order/workflows/cancel-order.ts:cancelOrderWorkflow
   ***** packages/core/core-flows/src/order/workflows/payments/refund-captured-payments.ts:refundCapturedPaymentsWorkflow
   **** packages/core/core-flows/src/payment/workflows/refund-payments.ts:refundPaymentsWorkflow
   *** packages/core/core-flows/src/payment/steps/refund-payments.ts:refundPaymentsStep
   ** packages/modules/payment/src/services/payment-module.ts:refundPayment
   * packages/modules/payment/src/services/payment-provider.ts:refundPayment
   *
   ***** packages/medusa/src/api/admin/payments/[id]/refund/route.ts:POST
   **** packages/core/core-flows/src/payment/workflows/refund-payment.ts:refundPaymentWorkflow
   *** packages/core/core-flows/src/payment/steps/refund-payment.ts:refundPaymentStep
   ** packages/modules/payment/src/services/payment-module.ts:refundPayment
   * packages/modules/payment/src/services/payment-provider.ts:refundPayment
   */
  public async refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentOutput> {
    this.log('refundPayment', input)
    // TODO: Implement refundPayment logic
    return {}
  }

  /**
   * This method isn't defined in the
   * packages/modules/payment/src/services/payment-provider.ts.
   *
   * All we can see is the DB operation (`this.retrievePayment`)
   * being invoked in two places (mentioned below) in the
   * packages/modules/payment/src/services/payment-module.
   *
   * Are these assumptions correct? What are we missing here?
   *
   * packages/modules/payment/src/services/payment-module.ts:cancelPayment
   * packages/modules/payment/src/services/payment-module.ts:refundPayment
   */
  public async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    this.log('retrievePayment', input)
    // TODO: Implement retrievePayment logic
    return {}
  }

  /**
   * We don't see this method being used beyond the Payment Module.
   * Are these assumptions correct?
   *
   ** packages/modules/payment/src/services/payment-module.ts:createPaymentMethods
   * packages/modules/payment/src/services/payment-provider.ts:savePaymentMethod
   */
  public async savePaymentMethod(
    input: SavePaymentMethodInput,
  ): Promise<SavePaymentMethodOutput> {
    this.log('savePaymentMethod', input)
    // TODO: Implement savePaymentMethod logic
    return { id: '' }
  }

  /**
   * We don't see this method being used beyond the Payment Module.
   * Are these assumptions correct?
   *
   ** packages/modules/payment/src/services/payment-module.ts:updateAccountHolder
   * packages/modules/payment/src/services/payment-provider.ts:updateAccountHolder
   */
  public async updateAccountHolder(
    input: UpdateAccountHolderInput,
  ): Promise<UpdateAccountHolderOutput> {
    this.log('updateAccountHolder', input)
    // TODO: Implement updateAccountHolder logic
    return {}
  }

  /**
   * We don't see this method being used beyond the Payment Module.
   * Are these assumptions correct?
   *
   ** packages/modules/payment/src/services/payment-module.ts:updatePaymentSession
   * packages/modules/payment/src/services/payment-provider.ts:updateSession
   */
  public async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    this.log('updatePayment', input)
    // TODO: Implement updatePayment logic
    return { status: 'pending' }
  }
}

export default AdyenProviderService

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

  public async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    // TODO: Implement cancelPayment logic
    this.log('cancelPayment', input)
    return {}
  }

  public async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    this.log('capturePayment', input)
    // TODO: Implement capturePayment logic
    return {}
  }

  public async createAccountHolder(
    input: CreateAccountHolderInput,
  ): Promise<CreateAccountHolderOutput> {
    this.log('createAccountHolder', input)
    // TODO: Implement createAccountHolder logic
    return { id: '' }
  }

  public async deleteAccountHolder(
    input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    this.log('deleteAccountHolder', input)
    // TODO: Implement createAccountHolder logic
    return {}
  }

  public async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    this.log('deletePayment', input)
    // TODO: Implement deletePayment logic
    return {}
  }

  public async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    this.log('getPaymentStatus', input)
    // TODO: Implement getPaymentStatus logic
    return { status: 'pending' }
  }

  public async getWebhookActionAndData(
    input: ProviderWebhookPayload['payload'],
  ): Promise<WebhookActionResult> {
    this.log('getWebhookActionAndData', input)
    // TODO: Implement getWebhookActionAndData logic
    return { action: 'not_supported' }
  }

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

  public async refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentOutput> {
    this.log('refundPayment', input)
    // TODO: Implement refundPayment logic
    return {}
  }

  public async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    this.log('retrievePayment', input)
    // TODO: Implement retrievePayment logic
    return {}
  }

  public async savePaymentMethod(
    input: SavePaymentMethodInput,
  ): Promise<SavePaymentMethodOutput> {
    this.log('savePaymentMethod', input)
    // TODO: Implement savePaymentMethod logic
    return { id: '' }
  }

  public async updateAccountHolder(
    input: UpdateAccountHolderInput,
  ): Promise<UpdateAccountHolderOutput> {
    this.log('updateAccountHolder', input)
    // TODO: Implement updateAccountHolder logic
    return {}
  }

  public async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    this.log('updatePayment', input)
    // TODO: Implement updatePayment logic
    return { status: 'pending' }
  }
}

export default AdyenProviderService

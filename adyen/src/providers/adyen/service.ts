import { CheckoutAPI, Client, hmacValidator, Types } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  BigNumberInput,
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
  ListPaymentMethodsOutput,
  Logger,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  SavePaymentMethodInput,
  SavePaymentMethodOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from '@medusajs/framework/types'
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
} from '@medusajs/framework/utils'
import {
  type Event,
  getMinorUnit,
  type Options,
  PaymentDataManager,
  validateOptions,
} from '../../utils'

interface Shopper
  extends Pick<
    Types.checkout.PaymentRequest,
    | 'shopperReference'
    | 'shopperEmail'
    | 'telephoneNumber'
    | 'shopperName'
    | 'company'
    | 'countryCode'
  > {}

interface InitiatePaymentInputData {
  request: Partial<Types.checkout.PaymentMethodsRequest>
}

interface SavePaymentMethodInputData {
  request: Types.checkout.StoredPaymentMethodRequest
}

interface AuthorizePaymentInputData {
  amount: Types.checkout.Amount
  detailsRequest?: Types.checkout.PaymentDetailsRequest
  request?: Types.checkout.PaymentRequest
  shopper?: Shopper
}

type ProviderWebhookPayloadData = Types.notification.Notification

interface InjectedDependencies extends Record<string, unknown> {
  logger: Logger
}

class AdyenProviderService extends AbstractPaymentProvider<Options> {
  static readonly identifier: string = 'adyen'
  protected readonly options_: Options
  protected logger_: Logger
  protected checkout: CheckoutAPI
  protected hmac: hmacValidator

  static validateOptions(options: Options): void {
    validateOptions(options)
  }

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options

    const { apiKey, liveEndpointUrlPrefix } = options
    const environment = options.environment || EnvironmentEnum.TEST

    const client = new Client({
      apiKey,
      environment,
      liveEndpointUrlPrefix,
    })
    this.checkout = new CheckoutAPI(client)
    this.hmac = new hmacValidator()
  }

  protected log(title: string, data: any, level?: keyof Logger): void {
    const { environment } = this.options_
    const defaultLoggingLevel =
      environment === EnvironmentEnum.TEST ? 'debug' : null
    const loggingLevel = level || defaultLoggingLevel
    const stringData = JSON.stringify(data, null, 2)
    const message = `${title}: ${stringData}`
    switch (loggingLevel) {
      case 'error':
        return this.logger_.error(message)
      case 'warn':
        return this.logger_.warn(message)
      case 'info':
        return this.logger_.info(message)
      case 'http':
        return this.logger_.http(message)
      case 'verbose':
        return this.logger_.verbose(message)
      case 'debug': {
        return this.logger_.debug(message)
      }
      default:
        return
    }
  }

  protected getAmount(
    amount: BigNumberInput,
    currency: string,
  ): Types.checkout.Amount {
    return {
      currency: currency.toUpperCase(),
      value: getMinorUnit(amount, currency),
    }
  }

  protected getSessionStatus(
    code?: Types.checkout.PaymentResponse.ResultCodeEnum,
  ): PaymentSessionStatus {
    const codes = Types.checkout.PaymentResponse.ResultCodeEnum
    switch (code) {
      // https://docs.adyen.com/online-payments/build-your-integration/payment-result-codes/
      case codes.Received:
      case codes.Pending:
      case codes.PresentToShopper:
        return 'pending'
      case codes.ChallengeShopper:
      case codes.IdentifyShopper:
      case codes.RedirectShopper:
      case codes.PartiallyAuthorised:
        return 'requires_more'
      case codes.Cancelled:
        return 'canceled'
      case codes.Authorised:
        return 'authorized'
      case codes.Error:
      case codes.Refused:
        return 'error'
      default:
        return 'error' // Default to error for unhandled cases
    }
  }

  protected validateHMAC(
    notification: Types.notification.NotificationRequestItem,
  ): boolean {
    const { hmacKey } = this.options_
    return this.hmac.validateHMAC(notification, hmacKey)
  }

  protected getAuthorisation(
    dataManager: ReturnType<typeof PaymentDataManager>,
  ): Event {
    if (!dataManager.isAuthorised()) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        'Payment not authorised.',
      )
    }

    return dataManager.getAuthorisation()!
  }

  protected handleAuthorisationResponse(
    response: Types.checkout.PaymentResponse,
    inputData: AuthorizePaymentInputData,
    reference: string,
  ): AuthorizePaymentOutput {
    const amount = response.amount || inputData.amount
    const dataManager = PaymentDataManager({ amount, reference })

    if (response.action) {
      const data = {
        amount,
        paymentResponse: response,
        reference,
        shopper: inputData.shopper,
      }
      const output = { data, status: 'requires_more' as const }
      this.log('handleAuthorisationResponse/action/output', output)
      return output
    }

    const status = this.getSessionStatus(response.resultCode)
    const date = new Date().toISOString()
    dataManager.setAuthorisation({
      amount,
      date,
      id: reference,
      merchantReference: response.merchantReference || reference,
      name: 'AUTHORISATION',
      providerReference: response.pspReference!,
      status: 'REQUESTED', // TODO: Handle other statuses
    })

    const data = dataManager.getData()
    const output = { data, status }
    this.log('handleAuthorisationResponse/output', output)
    return output
  }

  public async listPaymentMethods(
    input: ListPaymentMethodsInput,
  ): Promise<ListPaymentMethodsOutput> {
    this.log('listPaymentMethods/input', input)
    const { merchantAccount } = this.options_
    const shopper = input.context?.account_holder?.data as Shopper
    const shopperReference = shopper.shopperReference!
    const idempotencyKey = shopperReference

    const response =
      await this.checkout.RecurringApi.getTokensForStoredPaymentDetails(
        shopperReference,
        merchantAccount,
        { idempotencyKey },
      )

    const methods = response.storedPaymentMethods || []
    const output = methods.map((method, index) => ({
      data: method as Record<string, unknown>,
      id: method.id || index.toString(),
    }))
    this.log('listPaymentMethods/output', output)
    return output
  }

  public async savePaymentMethod(
    input: SavePaymentMethodInput,
  ): Promise<SavePaymentMethodOutput> {
    this.log('savePaymentMethod/input', input)
    const { merchantAccount } = this.options_
    const inputData = input.data as unknown as SavePaymentMethodInputData
    const shopper = input.context?.account_holder?.data as Shopper
    const shopperReference = shopper.shopperReference!
    const idempotencyKey = shopperReference
    const recurringProcessingModel =
      this.options_.recurringProcessingModel ||
      inputData.request.recurringProcessingModel
    const request: Types.checkout.StoredPaymentMethodRequest = {
      ...inputData.request,
      merchantAccount,
      recurringProcessingModel,
      shopperReference,
    }

    const response = await this.checkout.RecurringApi.storedPaymentMethods(
      request,
      { idempotencyKey },
    )

    const data = { ...response }
    const output = { data, id: response.id! }
    this.log('savePaymentMethod/output', output)
    return output
  }

  public async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Method not implemented.',
    )
  }

  public async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    this.log('initiatePayment/input', input)
    const { merchantAccount } = this.options_
    const inputData = input.data as unknown as InitiatePaymentInputData
    const sessionId = input.context!.idempotency_key!
    const shopper = input.context?.account_holder?.data as Shopper
    const amount = this.getAmount(input.amount, input.currency_code)
    const request: Types.checkout.PaymentMethodsRequest = {
      ...inputData.request,
      ...shopper,
      amount,
      merchantAccount,
    }

    const response = await this.checkout.PaymentsApi.paymentMethods(request)

    const data = {
      ...input.data,
      amount,
      paymentMethodsResponse: response,
      shopper,
    }
    const output = { data, id: sessionId }
    this.log('initiatePayment/output', output)
    return output
  }

  /**
   * We don't use this method.
   */
  public async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    return {}
  }

  public async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    this.log('updatePayment/input', input)
    const amount = this.getAmount(input.amount, input.currency_code)
    const data = { ...input.data, amount }
    const output = { data }
    this.log('updatePayment/output', output)
    return output
  }

  public async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    this.log('deletePayment/input', input)
    return { data: {} }
  }

  public async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    this.log('authorizePayment/input', input)
    const { merchantAccount } = this.options_
    const inputData = input.data as unknown as AuthorizePaymentInputData
    const shopper = inputData.shopper || {}
    const amount = inputData.amount
    const detailsRequest = inputData.detailsRequest
    const sessionId = input.context!.idempotency_key!
    const reference = sessionId
    const idempotencyKey = sessionId

    if (detailsRequest) {
      this.log('authorizePayment/detailsRequest', detailsRequest)
      const response = await this.checkout.PaymentsApi.paymentsDetails(
        detailsRequest,
        { idempotencyKey },
      )
      this.log('authorizePayment/detailsResponse', response)
      return this.handleAuthorisationResponse(response, inputData, reference)
    }

    if (!inputData.request) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        'Authorization request is missing!',
      )
    }

    const recurringProcessingModel =
      this.options_.recurringProcessingModel ||
      inputData.request.recurringProcessingModel
    const shopperInteraction =
      this.options_.shopperInteraction || inputData.request.shopperInteraction

    const request: Types.checkout.PaymentRequest = {
      ...inputData.request,
      ...shopper,
      amount,
      merchantAccount,
      recurringProcessingModel,
      reference,
      shopperInteraction,
    }

    this.log('authorizePayment/request', request)

    const response = await this.checkout.PaymentsApi.payments(request, {
      idempotencyKey,
    })

    this.log('authorizePayment/response', response)

    return this.handleAuthorisationResponse(response, inputData, reference)
  }

  public async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    this.log('cancelPayment/input', input)
    const { merchantAccount } = this.options_
    const dataManager = PaymentDataManager(input.data)
    const { reference, webhook, amount } = dataManager.getData()
    const paymentId = input.context?.idempotency_key
    const id = paymentId
    const idempotencyKey = paymentId

    if (webhook) {
      dataManager.setData({ webhook: undefined })
      const data = dataManager.getData()
      const output = { data }
      this.log('cancelPayment/output', output)
      return output
    }

    const authorisation = this.getAuthorisation(dataManager)
    const pspReference = authorisation.providerReference
    const request: Types.checkout.PaymentCancelRequest = {
      merchantAccount,
      reference,
    }

    const response =
      await this.checkout.ModificationsApi.cancelAuthorisedPaymentByPspReference(
        pspReference,
        request,
        { idempotencyKey },
      )

    const date = new Date().toISOString()
    dataManager.setEvent({
      amount,
      date,
      id,
      merchantReference: response.reference || reference,
      name: 'CANCELLATION',
      providerReference: response.pspReference,
      status: 'REQUESTED',
    })

    const data = dataManager.getData()
    const output = { data }
    this.log('cancelPayment/output', output)
    return output
  }

  public async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    this.log('capturePayment/input', input)
    const { merchantAccount } = this.options_
    const dataManager = PaymentDataManager(input.data)
    const { webhook, reference } = dataManager.getData()
    const captureId = input.context?.idempotency_key
    const id = captureId
    const idempotencyKey = captureId

    if (webhook) {
      dataManager.setData({ webhook: undefined })
      const data = dataManager.getData()
      const output = { data }
      this.log('capturePayment/output', output)
      return output
    }

    const authorisation = this.getAuthorisation(dataManager)
    const pspReference = authorisation.providerReference
    const amount = authorisation.amount
    const request: Types.checkout.PaymentCaptureRequest = {
      amount,
      merchantAccount,
      reference,
    }

    const response =
      await this.checkout.ModificationsApi.captureAuthorisedPayment(
        pspReference,
        request,
        { idempotencyKey },
      )

    const date = new Date().toISOString()
    dataManager.setEvent({
      amount,
      date,
      id,
      merchantReference: response.reference || reference,
      name: 'CAPTURE',
      providerReference: response.pspReference,
      status: 'REQUESTED',
    })
    const data = dataManager.getData()
    const output = { data }
    this.log('capturePayment/output', output)
    return output
  }

  public async refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentOutput> {
    this.log('refundPayment/input', input)
    const { merchantAccount } = this.options_
    const dataManager = PaymentDataManager(input.data)
    const { webhook, reference } = dataManager.getData()
    const refundId = input.context?.idempotency_key
    const id = refundId
    const idempotencyKey = refundId

    if (webhook) {
      dataManager.setData({ webhook: undefined })
      const data = dataManager.getData()
      const output = { data }
      this.log('refundPayment/output', output)
      return output
    }

    const authorisation = this.getAuthorisation(dataManager)
    const currency = authorisation.amount.currency
    const amount = this.getAmount(input.amount, currency)
    const pspReference = authorisation.providerReference
    const request: Types.checkout.PaymentRefundRequest = {
      amount,
      merchantAccount,
      reference,
    }

    const response = await this.checkout.ModificationsApi.refundCapturedPayment(
      pspReference,
      request,
      { idempotencyKey },
    )

    const date = new Date().toISOString()
    dataManager.setEvent({
      amount,
      date,
      id,
      merchantReference: response.reference || reference,
      name: 'REFUND',
      providerReference: response.pspReference,
      status: 'REQUESTED',
    })
    const data = dataManager.getData()
    const output = { data }
    this.log('refundPayment/output', output)
    return output
  }

  public async createAccountHolder(
    input: CreateAccountHolderInput,
  ): Promise<CreateAccountHolderOutput> {
    this.log('createAccountHolder/input', input)
    const {
      id,
      email,
      phone,
      first_name,
      last_name,
      company_name,
      billing_address,
    } = input.context.customer
    const shopperReference = id
    const shopperEmail = email
    const telephoneNumber = phone || undefined
    const firstName = first_name || undefined
    const lastName = last_name || undefined
    const companyName = company_name || undefined
    const countryCode = billing_address?.country_code || undefined
    const shopperName =
      firstName && lastName ? { firstName, lastName } : undefined
    const company = companyName ? { name: companyName } : undefined
    const data = {
      company,
      countryCode,
      shopperEmail,
      shopperName,
      shopperReference,
      telephoneNumber,
    }
    const output = { data, id }
    this.log('createAccountHolder/output', output)
    return output
  }

  public async deleteAccountHolder(
    input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    this.log('deleteAccountHolder/input', input)
    const { merchantAccount } = this.options_
    const shopper = input.context.account_holder.data as Shopper
    const shopperReference = shopper.shopperReference!
    const idempotencyKey = shopperReference

    const response =
      await this.checkout.RecurringApi.getTokensForStoredPaymentDetails(
        shopperReference,
        merchantAccount,
        { idempotencyKey },
      )

    const methods = response.storedPaymentMethods || []

    const promises = methods.map((method) => {
      if (!method.id) return Promise.resolve()
      const idempotencyKey = `${shopperReference}_${method.id}`
      return this.checkout.RecurringApi.deleteTokenForStoredPaymentDetails(
        method.id!,
        shopperReference,
        merchantAccount,
        { idempotencyKey },
      )
    })
    await Promise.all(promises)

    this.log('deleteAccountHolder/storedPaymentMethods', methods)
    return { data: {} }
  }

  public async getWebhookActionAndData(
    input: ProviderWebhookPayload['payload'],
  ): Promise<WebhookActionResult> {
    this.log('getWebhookActionAndData/input', input)
    const providerIdentifier = AdyenProviderService.identifier
    const inputData = input.data as unknown as ProviderWebhookPayloadData
    const { notificationItems } = inputData
    const validNotifications: Types.notification.NotificationRequestItem[] = []
    notificationItems.forEach((notificationItem) => {
      const notification = notificationItem.NotificationRequestItem
      if (this.validateHMAC(notification)) {
        validNotifications.push(notification)
      } else {
        this.log('getWebhookActionAndData/invalidNotification', notification)
      }
    })
    const data = {
      amount: 0,
      providerIdentifier,
      session_id: '',
      validNotifications,
    }
    const output = { action: PaymentActions.NOT_SUPPORTED, data }
    this.log('getWebhookActionAndData/output', output)
    return output
  }
}

export default AdyenProviderService

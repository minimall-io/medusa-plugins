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
  ListPaymentMethodsOutput,
  Logger,
  PaymentProviderInput,
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
  isDefined,
  MedusaError,
  PaymentActions,
} from '@medusajs/framework/utils'
import crypto from 'crypto'

import {
  getIdempotencyKey,
  getPaymentMethodsRequest,
  getPaymentOptions,
  getPaymentRequest,
  resolvePaymentSessionStatus,
} from './util'

import { ADYEN } from './constants'

interface Options {
  apiKey: string
  merchantAccount: string
  returnUrlBase: string
  environment?: EnvironmentEnum
  liveEndpointUrlPrefix?: string
}

interface InjectedDependencies extends Record<string, unknown> {
  logger: Logger
}

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

  static validateOptions(options: Options): void {
    const { apiKey, merchantAccount, returnUrlBase } = options

    if (!isDefined<string>(apiKey)) {
      const errorMessage = `${ADYEN} API key is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }

    if (!isDefined<string>(merchantAccount)) {
      const errorMessage = `${ADYEN} merchant account is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }

    if (!isDefined<string>(returnUrlBase)) {
      const errorMessage = `${ADYEN} authorization return url base is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }
  }

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options

    const { apiKey, environment, liveEndpointUrlPrefix } = options
    const defaultEnvironment = !isDefined<EnvironmentEnum | undefined>(
      environment,
    )
      ? EnvironmentEnum.TEST
      : environment

    this.client = new Client({
      apiKey,
      environment: defaultEnvironment,
      liveEndpointUrlPrefix,
    })
    this.checkoutAPI = new CheckoutAPI(this.client)
  }

  protected listPaymentMethods_(
    input: PaymentProviderInput,
  ): Promise<Types.checkout.PaymentMethodsResponse> {
    const options = getPaymentOptions(input.data)
    const request = getPaymentMethodsRequest(
      this.options_.merchantAccount,
      input.data,
      input.context,
    )

    return this.checkoutAPI.PaymentsApi.paymentMethods(request, options)
  }

  public async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    this.log('authorizePayment input', input)

    const options = getPaymentOptions(input.data)
    const request = getPaymentRequest(
      this.options_.merchantAccount,
      this.options_.returnUrlBase,
      input.data,
      input.context,
    )
    const response = await this.checkoutAPI.PaymentsApi.payments(
      request,
      options,
    )
    const { resultCode } = response
    const status = resolvePaymentSessionStatus(resultCode)
    const data = { paymentResponse: response }

    this.log('authorizePayment output', { data, status })

    return { data, status }
  }

  public async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    // TODO: Implement cancelPayment logic
    this.log('cancelPayment', input)
    return { data: {} }
  }

  public async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    this.log('capturePayment', input)
    // TODO: Implement capturePayment logic
    return { data: {} }
  }

  public async createAccountHolder(
    input: CreateAccountHolderInput,
  ): Promise<CreateAccountHolderOutput> {
    this.log('createAccountHolder', input)
    // TODO: Implement createAccountHolder logic
    return { id: input.context.customer.id }
  }

  public async deleteAccountHolder(
    input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    this.log('deleteAccountHolder', input)
    // TODO: Implement createAccountHolder logic
    return { data: {} }
  }

  public async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    this.log('deletePayment', input)
    // TODO: Implement deletePayment logic
    return { data: {} }
  }

  public async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    this.log('getPaymentStatus', input)
    // TODO: Implement getPaymentStatus logic
    throw new Error('Method not implemented.')
  }

  public async getWebhookActionAndData(
    input: ProviderWebhookPayload['payload'],
  ): Promise<WebhookActionResult> {
    this.log('getWebhookActionAndData', input)
    // TODO: Implement getWebhookActionAndData logic
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  public async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    this.log('initiatePayment input', input)

    const paymentMethods = await this.listPaymentMethods_(input)
    const id = getIdempotencyKey(input.data)
    const data = { ...paymentMethods }

    this.log('initiatePayment output', { data, id })

    return { data, id }
  }

  public async listPaymentMethods(
    input: ListPaymentMethodsInput,
  ): Promise<ListPaymentMethodsOutput> {
    this.log('listPaymentMethods input', input)

    const methods = await this.listPaymentMethods_(input)

    const filteredStored =
      methods.storedPaymentMethods?.filter(
        (method) => method.id !== undefined,
      ) || []

    const storedMethods =
      filteredStored.map((method) => ({
        id: method.id!,
        data: method as Record<string, unknown>,
      })) || []

    this.log('listPaymentMethods output', storedMethods)

    return [...storedMethods]
  }

  public async refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentOutput> {
    this.log('refundPayment', input)
    // TODO: Implement refundPayment logic
    return { data: {} }
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
    return { data: {}, id: input.context?.customer?.id || crypto.randomUUID() }
  }

  public async updateAccountHolder(
    input: UpdateAccountHolderInput,
  ): Promise<UpdateAccountHolderOutput> {
    this.log('updateAccountHolder', input)
    // TODO: Implement updateAccountHolder logic
    return { data: {} }
  }

  public async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    this.log('updatePayment', input)
    // TODO: Implement updatePayment logic
    return { data: {} }
  }
}

export default AdyenProviderService

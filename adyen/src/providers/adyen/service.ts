import { CheckoutAPI, Client } from '@adyen/api-library'
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
  getPaymentCancelRequest,
  getPaymentCaptureRequest,
  getPaymentMethodsRequest,
  getPaymentRefundRequest,
  getPaymentRequest,
  getPaymentSessionStatus,
  getTransientData,
} from './util'

import { ADYEN } from './constants'

interface Options {
  apiKey: string
  hmacKey: string
  merchantAccount: string
  liveEndpointUrlPrefix: string
  returnUrlPrefix: string
  environment?: EnvironmentEnum
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

  static validateOptions(options: Options): void {
    const {
      apiKey,
      hmacKey,
      merchantAccount,
      liveEndpointUrlPrefix,
      returnUrlPrefix,
    } = options

    if (!isDefined<string>(apiKey)) {
      const errorMessage = `${ADYEN} API key is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }

    if (!isDefined<string>(hmacKey)) {
      const errorMessage = `${ADYEN} HMAC key is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }

    if (!isDefined<string>(merchantAccount)) {
      const errorMessage = `${ADYEN} merchant account is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }

    if (!isDefined<string>(liveEndpointUrlPrefix)) {
      const errorMessage = `${ADYEN} live endpoint URL prefix is not configured!`
      throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage)
    }

    if (!isDefined<string>(returnUrlPrefix)) {
      const errorMessage = `${ADYEN} authorization return url prefix is not configured!`
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

  protected log(title: string, data: any, level: keyof Logger = 'debug'): void {
    const message = `${title}: ${JSON.stringify(data, null, 2)}`
    switch (level) {
      case 'error':
        this.logger_.error(message)
      case 'warn':
        this.logger_.warn(message)
      case 'info':
        this.logger_.info(message)
      default:
        console.log(message) // remove after debugging
    }
  }

  public async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    try {
      // this.log('authorizePayment/input', input)
      const transientData = getTransientData(input)
      const request = getPaymentRequest(
        this.options_.merchantAccount,
        this.options_.returnUrlPrefix,
        input,
      )
      const paymentResponse =
        await this.checkoutAPI.PaymentsApi.payments(request)
      const { resultCode } = paymentResponse
      const data = { ...transientData, paymentResponse }
      const status = getPaymentSessionStatus(resultCode)
      this.log('authorizePayment/request', request)
      this.log('authorizePayment/output', { data, status })
      return { data, status }
    } catch (error) {
      this.log('authorizePayment/error', error)
      throw error
    }
  }

  public async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    try {
      this.log('cancelPayment/input', input)
      const transientData = getTransientData(input)
      const { paymentResponse } = transientData
      const request = getPaymentCancelRequest(
        this.options_.merchantAccount,
        input,
      )

      const paymentCancelResponse =
        await this.checkoutAPI.ModificationsApi.cancelAuthorisedPaymentByPspReference(
          paymentResponse!.pspReference!,
          request,
        )

      const data = { ...transientData, paymentCancelResponse }
      this.log('cancelPayment/request', request)
      this.log('cancelPayment/output', { data })
      return { data }
    } catch (error) {
      this.log('cancelPayment/error', error)
      throw error
    }
  }

  public async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    try {
      // this.log('capturePayment/input', input)
      const transientData = getTransientData(input)
      const { paymentResponse } = transientData
      const request = getPaymentCaptureRequest(
        this.options_.merchantAccount,
        input,
      )

      const paymentCaptureResponse =
        await this.checkoutAPI.ModificationsApi.captureAuthorisedPayment(
          paymentResponse!.pspReference!,
          request,
        )

      const data = { ...transientData, paymentCaptureResponse }
      this.log('capturePayment/request', request)
      this.log('capturePayment/output', { data })
      return { data }
    } catch (error) {
      this.log('capturePayment/error', error)
      throw error
    }
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
    try {
      // this.log('initiatePayment/input', input)
      const transientData = getTransientData(input)
      const { sessionId } = transientData
      const request = getPaymentMethodsRequest(
        this.options_.merchantAccount,
        input,
      )
      const paymentMethods =
        await this.checkoutAPI.PaymentsApi.paymentMethods(request)
      const data = { ...paymentMethods, ...transientData }
      this.log('initiatePayment/request', request)
      this.log('initiatePayment/output', { data, id: sessionId })
      return { data, id: sessionId }
    } catch (error) {
      this.log('initiatePayment/error', error)
      throw error
    }
  }

  public async listPaymentMethods(
    input: ListPaymentMethodsInput,
  ): Promise<ListPaymentMethodsOutput> {
    try {
      // this.log('listPaymentMethods/input', input)
      const request = getPaymentMethodsRequest(
        this.options_.merchantAccount,
        input,
      )
      const methods = await this.checkoutAPI.PaymentsApi.paymentMethods(request)

      const filteredStored =
        methods.storedPaymentMethods?.filter(
          (method) => method.id !== undefined,
        ) || []

      const storedMethods =
        filteredStored.map((method) => ({
          id: method.id!,
          data: method as Record<string, unknown>,
        })) || []

      this.log('listPaymentMethods/request', request)
      this.log('listPaymentMethods/output', storedMethods)
      return [...storedMethods]
    } catch (error) {
      this.log('listPaymentMethods/error', error)
      throw error
    }
  }

  public async refundPayment(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentOutput> {
    try {
      this.log('refundPayment/input', input)
      const transientData = getTransientData(input)
      const { paymentCaptureResponse } = transientData
      const request = getPaymentRefundRequest(
        this.options_.merchantAccount,
        input,
      )

      const paymentRefundResponse =
        await this.checkoutAPI.ModificationsApi.refundCapturedPayment(
          paymentCaptureResponse!.pspReference!,
          request,
        )

      const data = { ...transientData, paymentRefundResponse }
      this.log('refundPayment/request', request)
      this.log('refundPayment/output', { data })
      return { data }
    } catch (error) {
      this.log('refundPayment/error', error)
      throw error
    }
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

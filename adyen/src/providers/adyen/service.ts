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
  PaymentActions,
} from '@medusajs/framework/utils'
import crypto from 'crypto'

import { getMinorUnit, getPaymentSessionStatus } from './util'

import {
  Options,
  validateAuthorizePaymentInput,
  validateCancelPaymentInput,
  validateCapturePaymentInput,
  validateInitiatePaymentInput,
  validateListPaymentMethodsInput,
  validateOptions,
  validateRefundPaymentInput,
} from './validators'

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
    validateOptions(options)
  }

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options

    const { apiKey, environment, liveEndpointUrlPrefix } = options
    const defaultEnvironment = environment || EnvironmentEnum.TEST

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
    this.log('authorizePayment/input', input)
    try {
      const validInput = validateAuthorizePaymentInput(input)
      const { merchantAccount, returnUrlPrefix: returnUrl } = this.options_
      const { reference, paymentRequest } = validInput.data
      const request: Types.checkout.PaymentRequest = {
        ...paymentRequest,
        merchantAccount,
        reference,
        returnUrl,
      }
      const paymentResponse =
        await this.checkoutAPI.PaymentsApi.payments(request)
      const { resultCode } = paymentResponse
      const data = { ...input.data, paymentResponse }
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
    this.log('cancelPayment/input', input)
    try {
      const validInput = validateCancelPaymentInput(input)
      const { merchantReference: reference, pspReference } =
        validInput.data.paymentResponse
      const { merchantAccount } = this.options_
      const request: Types.checkout.PaymentCancelRequest = {
        merchantAccount,
        reference,
      }

      const paymentCancelResponse =
        await this.checkoutAPI.ModificationsApi.cancelAuthorisedPaymentByPspReference(
          pspReference,
          request,
        )

      const data = { ...input.data, paymentCancelResponse }
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
    this.log('capturePayment/input', input)
    try {
      const validInput = validateCapturePaymentInput(input)
      const {
        merchantReference: reference,
        pspReference,
        amount,
      } = validInput.data.paymentResponse
      const { merchantAccount } = this.options_
      const request: Types.checkout.PaymentCaptureRequest = {
        merchantAccount,
        amount,
        reference,
      }

      const paymentCaptureResponse =
        await this.checkoutAPI.ModificationsApi.captureAuthorisedPayment(
          pspReference,
          request,
        )

      const data = { ...input.data, paymentCaptureResponse }
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
    this.log('createAccountHolder/input', input)
    // TODO: Implement createAccountHolder logic
    return { id: input.context.customer.id }
  }

  public async deleteAccountHolder(
    input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    this.log('deleteAccountHolder/input', input)
    // TODO: Implement createAccountHolder logic
    return { data: {} }
  }

  public async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    this.log('deletePayment/input', input)
    return { data: {} }
  }

  public async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    this.log('getPaymentStatus/input', input, 'error')
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Method not implemented.',
    )
  }

  public async getWebhookActionAndData(
    input: ProviderWebhookPayload['payload'],
  ): Promise<WebhookActionResult> {
    this.log('getWebhookActionAndData/input', input)
    // TODO: Implement getWebhookActionAndData logic
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  public async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    this.log('initiatePayment/input', input)
    try {
      const paymentRequest = input?.data?.paymentRequest || {}
      const validInput = validateInitiatePaymentInput(input)
      const { reference, currency_code, amount: total } = validInput
      const currency = currency_code.toUpperCase()
      const value = getMinorUnit(total, currency_code)
      const amount: Types.checkout.Amount = {
        currency,
        value,
      }

      const { merchantAccount } = this.options_
      const paymentMethodsRequest = validInput?.data?.paymentRequest

      const request: Types.checkout.PaymentMethodsRequest = {
        ...paymentMethodsRequest,
        amount,
        merchantAccount,
      }
      const paymentMethodsResponse =
        await this.checkoutAPI.PaymentsApi.paymentMethods(request)
      const data = {
        paymentRequest: { ...paymentRequest, amount },
        paymentMethodsResponse,
        reference,
      }
      this.log('initiatePayment/request', request)
      this.log('initiatePayment/output', { data, id: reference })
      return { data, id: reference }
    } catch (error) {
      this.log('initiatePayment/error', error)
      throw error
    }
  }

  public async listPaymentMethods(
    input: ListPaymentMethodsInput,
  ): Promise<ListPaymentMethodsOutput> {
    this.log('listPaymentMethods/input', input)
    try {
      const validInput = validateListPaymentMethodsInput(input)
      const { merchantAccount } = this.options_
      const paymentRequest = validInput?.data?.paymentRequest
      const request: Types.checkout.PaymentMethodsRequest = {
        ...paymentRequest,
        merchantAccount,
      }
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
    this.log('refundPayment/input', input)
    try {
      const validInput = validateRefundPaymentInput(input)
      const {
        reference,
        pspReference: capturePspReference,
        amount: captureAmount,
      } = validInput.data.paymentCaptureResponse
      const { merchantAccount } = this.options_
      const currency = captureAmount.currency.toUpperCase()
      const value = getMinorUnit(validInput.amount, currency)
      const amount: Types.checkout.Amount = {
        currency,
        value,
      }
      const request: Types.checkout.PaymentRefundRequest = {
        merchantAccount,
        capturePspReference,
        reference,
        amount,
      }

      const paymentRefundResponse =
        await this.checkoutAPI.ModificationsApi.refundCapturedPayment(
          capturePspReference,
          request,
        )

      const data = { ...input.data, paymentRefundResponse }
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
    this.log('retrievePayment/input', input)
    // TODO: Implement retrievePayment logic
    return {}
  }

  public async savePaymentMethod(
    input: SavePaymentMethodInput,
  ): Promise<SavePaymentMethodOutput> {
    this.log('savePaymentMethod/input', input)
    // TODO: Implement savePaymentMethod logic
    return { data: {}, id: input.context?.customer?.id || crypto.randomUUID() }
  }

  public async updateAccountHolder(
    input: UpdateAccountHolderInput,
  ): Promise<UpdateAccountHolderOutput> {
    this.log('updateAccountHolder/input', input)
    // TODO: Implement updateAccountHolder logic
    return { data: {} }
  }

  public async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    this.log('updatePayment/input', input)
    // TODO: Implement updatePayment logic
    return { data: {} }
  }
}

export default AdyenProviderService

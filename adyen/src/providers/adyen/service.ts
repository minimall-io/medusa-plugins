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
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from '@medusajs/framework/types'
import {
  AbstractPaymentProvider,
  PaymentActions,
} from '@medusajs/framework/utils'

import { getMinorUnit, getSessionStatus, getStoredPaymentMethod } from './utils'

import {
  Options,
  validateCancelPaymentInput,
  validateCapturePaymentInput,
  validateCreateAccountHolderInput,
  validateDeleteAccountHolderInput,
  validateGetPaymentStatusInput,
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

  protected constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options

    const { apiKey, liveEndpointUrlPrefix, environment } = options

    this.client = new Client({
      apiKey,
      environment: environment || EnvironmentEnum.TEST,
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

  protected async listStoredPaymentMethods_(
    shopperReference: string,
  ): Promise<Types.checkout.StoredPaymentMethodResource[]> {
    const { merchantAccount } = this.options_
    const idempotencyKey = `listStoredPaymentMethods_${shopperReference}`
    const response =
      await this.checkoutAPI.RecurringApi.getTokensForStoredPaymentDetails(
        shopperReference,
        merchantAccount,
        { idempotencyKey },
      )
    const { storedPaymentMethods } = response
    return storedPaymentMethods || []
  }

  protected deleteStoredPaymentMethod_(
    shopperReference: string,
    method: Types.checkout.StoredPaymentMethodResource,
  ): Promise<void> {
    const { merchantAccount } = this.options_
    if (!method.id) return Promise.resolve()
    const idempotencyKey = `deleteStoredPaymentMethod_${shopperReference}_${method.id}`
    return this.checkoutAPI.RecurringApi.deleteTokenForStoredPaymentDetails(
      method.id!,
      shopperReference,
      merchantAccount,
      { idempotencyKey },
    )
  }

  protected async createSession_(
    reference: string,
    amount: Types.checkout.Amount,
    sessionRequest: Partial<Types.checkout.CreateCheckoutSessionRequest>,
  ): Promise<Types.checkout.CreateCheckoutSessionResponse> {
    const {
      recurringProcessingModel,
      shopperInteraction,
      returnUrlPrefix: returnUrl,
      merchantAccount,
    } = this.options_
    const request: Types.checkout.CreateCheckoutSessionRequest = {
      ...sessionRequest,
      amount,
      reference,
      recurringProcessingModel,
      shopperInteraction,
      returnUrl,
      merchantAccount,
    }
    const idempotencyKey = `createSession_${reference}`
    return this.checkoutAPI.PaymentsApi.sessions(request, { idempotencyKey })
  }

  protected getSessionResult_(
    sessionId: string,
    sessionResult: string,
  ): Promise<Types.checkout.SessionResultResponse> {
    const idempotencyKey = `getSessionResult_${sessionId}`
    return this.checkoutAPI.PaymentsApi.getResultOfPaymentSession(
      sessionId,
      sessionResult,
      { idempotencyKey },
    )
  }

  protected cancelPayment_(
    paymentReference: string,
  ): Promise<Types.checkout.StandalonePaymentCancelResponse> {
    const { merchantAccount } = this.options_
    const request: Types.checkout.StandalonePaymentCancelRequest = {
      merchantAccount,
      paymentReference,
    }
    const idempotencyKey = `cancelPayment_${paymentReference}`
    return this.checkoutAPI.ModificationsApi.cancelAuthorisedPayment(request, {
      idempotencyKey,
    })
  }

  protected capturePayment_(
    reference: string,
    pspReference: string,
    amount: Types.checkout.Amount,
  ): Promise<Types.checkout.PaymentCaptureResponse> {
    const { merchantAccount } = this.options_
    const request: Types.checkout.PaymentCaptureRequest = {
      merchantAccount,
      amount,
      reference,
    }
    const idempotencyKey = `capturePayment_${reference}_${pspReference}`
    return this.checkoutAPI.ModificationsApi.captureAuthorisedPayment(
      pspReference,
      request,
      { idempotencyKey },
    )
  }

  protected refundPayment_(
    reference: string,
    pspReference: string,
    amount: Types.checkout.Amount,
  ): Promise<Types.checkout.PaymentRefundResponse> {
    const { merchantAccount } = this.options_
    const request: Types.checkout.PaymentRefundRequest = {
      merchantAccount,
      reference,
      amount,
    }
    const idempotencyKey = `refundPayment_${reference}_${pspReference}`
    return this.checkoutAPI.ModificationsApi.refundCapturedPayment(
      pspReference,
      request,
      { idempotencyKey },
    )
  }

  public async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    return this.getPaymentStatus(input)
  }

  public async cancelPayment(
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> {
    this.log('cancelPayment/input', input)
    try {
      const validInput = validateCancelPaymentInput(input)
      const { reference } = validInput.data
      const response = await this.cancelPayment_(reference)
      const data = { ...input.data, paymentCancelResponse: response }
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
      const { reference, sessionResult } = validInput.data
      const payments = sessionResult.payments || []
      const promises = payments.map(({ pspReference, amount }) => {
        if (!pspReference || !amount) return null
        return this.capturePayment_(reference, pspReference, amount)
      })
      const responses = await Promise.all(promises)
      const captures = validInput.data.paymentCaptureResponses || []
      const paymentCaptureResponses = [...captures, ...responses]
      const data = { ...input.data, paymentCaptureResponses }
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
    const validInput = validateCreateAccountHolderInput(input)
    const { id } = validInput.context.customer
    return { id }
  }

  public async deleteAccountHolder(
    input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    this.log('deleteAccountHolder/input', input)
    try {
      const validInput = validateDeleteAccountHolderInput(input)
      const shopperReference = validInput.context.account_holder.id
      const methods = await this.listStoredPaymentMethods_(shopperReference)
      const promises = methods.map((method) =>
        this.deleteStoredPaymentMethod_(shopperReference, method),
      )
      await Promise.all(promises)
      this.log('deleteAccountHolder/storedPaymentMethods', methods)
      return { data: {} }
    } catch (error) {
      this.log('deleteAccountHolder/error', error)
      throw error
    }
  }

  public async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    this.log('getPaymentStatus/input', input, 'info')
    return { data: {} }
  }

  public async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    this.log('getPaymentStatus/input', input)
    try {
      const validInput = validateGetPaymentStatusInput(input)
      const sessionId = validInput.data.sessionResponse.id
      const sessionResult = validInput.data.paymentData.sessionResult
      const response = await this.getSessionResult_(sessionId, sessionResult)
      const status = getSessionStatus(response.status)
      const data = { ...input.data, sessionResult: response }
      this.log('getPaymentStatus/output', { data, status })
      return { data, status }
    } catch (error) {
      this.log('getPaymentStatus/error', error)
      throw error
    }
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
      const validInput = validateInitiatePaymentInput(input)
      const sessionRequest = validInput?.data?.sessionRequest
      const shopperReference = validInput.context?.account_holder?.id
      const reference = validInput.reference
      const currency = validInput.currency_code.toUpperCase()
      const value = getMinorUnit(validInput.amount, currency)
      const amount: Types.checkout.Amount = {
        currency,
        value,
      }
      const request: Partial<Types.checkout.CreateCheckoutSessionRequest> = {
        ...sessionRequest,
        shopperReference,
      }
      const response = await this.createSession_(reference, amount, request)
      const data = {
        session: response,
        reference,
        session_id: reference,
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
      const shopperReference = validInput.context.account_holder.data.id
      const methods = await this.listStoredPaymentMethods_(shopperReference)
      const formattedMethods = methods.map(getStoredPaymentMethod)
      this.log('listPaymentMethods/output', formattedMethods)
      return [...formattedMethods]
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
      const { reference, sessionResult, sessionResponse } = validInput.data
      const currency = sessionResponse.amount.currency
      let balance = getMinorUnit(validInput.amount, currency)
      const payments = sessionResult.payments || []
      const promises = payments.map(({ pspReference, amount }) => {
        if (balance === 0) return null
        if (!pspReference || !amount) return null
        if (amount.currency !== currency) return null
        const value = amount.value < balance ? amount.value : balance
        balance -= value
        const newAmount: Types.checkout.Amount = {
          currency,
          value,
        }
        return this.refundPayment_(reference, pspReference, newAmount)
      })
      const responses = await Promise.all(promises)
      const refunds = validInput.data.paymentRefundResponses || []
      const paymentRefundResponses = [...refunds, ...responses]
      const data = { ...input.data, paymentRefundResponses }
      this.log('refundPayment/output', { data })
      return { data }
    } catch (error) {
      this.log('refundPayment/error', error)
      throw error
    }
  }

  /**
   * As of this writing, this method isn't defined in the
   * packages/modules/payment/src/services/payment-provider.ts.
   */
  public async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    return {}
  }

  /**
   * We don't use this method at the moment.
   */
  public async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    return { data: input.data }
  }
}

export default AdyenProviderService

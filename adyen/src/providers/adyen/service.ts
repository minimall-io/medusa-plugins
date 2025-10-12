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

import {
  getMinorUnit,
  getPaymentSessionStatus,
  getStoredPaymentMethod,
} from './utils'

import {
  Options,
  validateAuthorizePaymentInput,
  validateCancelPaymentInput,
  validateCapturePaymentInput,
  validateCreateAccountHolderInput,
  validateDeleteAccountHolderInput,
  validateInitiatePaymentInput,
  validateListPaymentMethodsInput,
  validateOptions,
  validateRefundPaymentInput,
  validateSavePaymentMethodInput,
  validateUpdatePaymentInput,
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

  protected async listStoredPaymentMethods(
    shopperReference: string,
  ): Promise<Types.checkout.StoredPaymentMethodResource[]> {
    const { merchantAccount } = this.options_
    const response =
      await this.checkoutAPI.RecurringApi.getTokensForStoredPaymentDetails(
        shopperReference,
        merchantAccount,
      )
    const { storedPaymentMethods } = response
    return storedPaymentMethods || []
  }

  protected async deleteStoredPaymentMethods(
    shopperReference: string,
    methods: Types.checkout.StoredPaymentMethodResource[],
  ): Promise<void> {
    const { merchantAccount } = this.options_
    const promises = methods.map((method) => {
      if (!method.id) return
      return this.checkoutAPI.RecurringApi.deleteTokenForStoredPaymentDetails(
        method.id!,
        shopperReference,
        merchantAccount,
      )
    })

    await Promise.all(promises)
  }

  public async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    this.log('authorizePayment/input', input)
    try {
      const {
        merchantAccount,
        returnUrlPrefix: returnUrl,
        shopperInteraction,
        recurringProcessingModel,
      } = this.options_
      const validInput = validateAuthorizePaymentInput(input)
      const { reference, paymentRequest } = validInput.data
      const request: Types.checkout.PaymentRequest = {
        ...paymentRequest,
        reference,
        merchantAccount,
        returnUrl,
        shopperInteraction,
        recurringProcessingModel,
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
      const { merchantAccount } = this.options_
      const validInput = validateCancelPaymentInput(input)
      const {
        reference,
        paymentResponse: { pspReference },
      } = validInput.data
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
      const { merchantAccount } = this.options_
      const validInput = validateCapturePaymentInput(input)
      const {
        reference,
        paymentResponse: { amount, pspReference },
      } = validInput.data
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
      const captures = validInput.data.paymentCaptureResponses || []
      const paymentCaptureResponses = [...captures, paymentCaptureResponse]
      const data = { ...input.data, paymentCaptureResponses }
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
      const storedPaymentMethods =
        await this.listStoredPaymentMethods(shopperReference)
      await this.deleteStoredPaymentMethods(
        shopperReference,
        storedPaymentMethods,
      )
      this.log('deleteAccountHolder/storedPaymentMethods', storedPaymentMethods)
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
      const { reference, currency_code, amount: total, context } = validInput
      const shopperReference = context?.account_holder?.id
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
        shopperReference,
        amount,
        merchantAccount,
      }
      const paymentMethodsResponse =
        await this.checkoutAPI.PaymentsApi.paymentMethods(request)
      const data = {
        paymentRequest: { ...paymentRequest, amount, shopperReference },
        paymentMethodsResponse,
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
      const storedPaymentMethods =
        await this.listStoredPaymentMethods(shopperReference)
      const formattedMethods = storedPaymentMethods.map(getStoredPaymentMethod)
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
      const {
        reference,
        paymentResponse: { pspReference, amount: paymentAmount },
      } = validInput.data
      const { merchantAccount } = this.options_
      const currency = paymentAmount.currency.toUpperCase()
      const value = getMinorUnit(validInput.amount, currency)
      const amount: Types.checkout.Amount = {
        currency,
        value,
      }
      const request: Types.checkout.PaymentRefundRequest = {
        merchantAccount,
        reference,
        amount,
      }

      const paymentRefundResponse =
        await this.checkoutAPI.ModificationsApi.refundCapturedPayment(
          pspReference,
          request,
        )

      const refunds = validInput.data.paymentRefundResponses || []
      const paymentRefundResponses = [...refunds, paymentRefundResponse]
      const data = { ...input.data, paymentRefundResponses }
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
    try {
      const validInput = validateSavePaymentMethodInput(input)
      const { merchantAccount, recurringProcessingModel } = this.options_
      const { storedPaymentMethodRequest } = validInput.data
      const request: Types.checkout.StoredPaymentMethodRequest = {
        ...storedPaymentMethodRequest,
        merchantAccount,
        recurringProcessingModel,
      }
      const storedPaymentMethod =
        await this.checkoutAPI.RecurringApi.storedPaymentMethods(request)
      if (!storedPaymentMethod.id)
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Stored Method is missing ID!',
        )
      const methods = validInput.data.storedPaymentMethods || []
      const storedPaymentMethods = [...methods, storedPaymentMethod]
      const data = { ...input.data, storedPaymentMethods }
      const { id } = storedPaymentMethod
      this.log('savePaymentMethod/output', { data, id })
      return { data, id }
    } catch (error) {
      this.log('savePaymentMethod/error', error)
      throw error
    }
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
    /**
     * This code is meant to work with an authorized transaction,
     * as it expects the `input.data.paymentResponse` to be
     * present in the `input` parameter.
     *
     * It will always result in error, assuming the the statement from the documentation is correct:
     *
     * "This method updates a payment in the third-party service
     * that was previously initiated with the `initiatePayment` method."
     * (https://docs.medusajs.com/resources/references/payment/provider#updatepayment)
     *
     *
     * Also, at the time of this writing, we can't trace this method beyond the Payment Module source code.
     * The `updatePaymentSession` keyword doesn't appear anywhere else in the medusa source code.
     * We are not sure if we are missing something from this observation.
     *
     * --- packages/modules/payment/src/services/payment-module.ts:PaymentModuleService.updatePaymentSession
     * -- packages/modules/payment/src/services/payment-provider.ts:PaymentProviderService.updateSession
     * - adyen/src/providers/adyen/service.ts:AdyenProviderService.updatePayment
     */
    try {
      const validInput = validateUpdatePaymentInput(input)
      const {
        reference,
        paymentResponse: { pspReference },
      } = validInput.data
      const { merchantAccount } = this.options_
      const currency = validInput.currency_code.toUpperCase()
      const value = getMinorUnit(validInput.amount, currency)
      const amount: Types.checkout.Amount = {
        currency,
        value,
      }
      const request: Types.checkout.PaymentAmountUpdateRequest = {
        merchantAccount,
        reference,
        amount,
      }

      const paymentAmountUpdateResponse =
        await this.checkoutAPI.ModificationsApi.updateAuthorisedAmount(
          pspReference,
          request,
        )

      const updates = validInput.data.paymentAmountUpdateResponses || []
      const paymentAmountUpdateResponses = [
        ...updates,
        paymentAmountUpdateResponse,
      ]
      const data = { ...input.data, paymentAmountUpdateResponses }
      this.log('updatePayment/request', request)
      this.log('updatePayment/output', { data })
      return { data }
    } catch (error) {
      this.log('updatePayment/error', error)
      throw error
    }
  }
}

export default AdyenProviderService

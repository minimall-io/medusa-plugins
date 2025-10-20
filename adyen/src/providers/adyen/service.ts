import { CheckoutAPI, Client, Types, hmacValidator } from '@adyen/api-library'
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

import {
  getAmount,
  getMinorUnit,
  getSessionStatus,
  getStoredPaymentMethod,
} from './utils'

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
  validateProviderWebhookPayload,
  validateRefundPaymentInput,
} from './validators'

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

    const { apiKey, liveEndpointUrlPrefix, environment } = options

    const client = new Client({
      apiKey,
      environment: environment || EnvironmentEnum.TEST,
      liveEndpointUrlPrefix,
    })
    this.checkout = new CheckoutAPI(client)
    this.hmac = new hmacValidator()
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

  protected validateHMAC(
    notification: Types.notification.NotificationRequestItem,
  ): boolean {
    const { hmacKey } = this.options_
    console.log('validateHMAC/hmacKey', hmacKey)
    return this.hmac.validateHMAC(notification, hmacKey)
  }

  protected async listStoredPaymentMethods_(
    shopperReference: string,
  ): Promise<Types.checkout.StoredPaymentMethodResource[]> {
    const { merchantAccount } = this.options_
    const idempotencyKey = `listStoredPaymentMethods_${shopperReference}`
    const response =
      await this.checkout.RecurringApi.getTokensForStoredPaymentDetails(
        shopperReference,
        merchantAccount,
        { idempotencyKey },
      )
    const { storedPaymentMethods } = response
    return storedPaymentMethods || []
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
      const { merchantAccount } = this.options_
      const validInput = validateCancelPaymentInput(input)
      const { reference: paymentReference } = validInput.data
      const request: Types.checkout.StandalonePaymentCancelRequest = {
        merchantAccount,
        paymentReference,
      }
      const idempotencyKey = paymentReference
      const response =
        await this.checkout.ModificationsApi.cancelAuthorisedPayment(request, {
          idempotencyKey,
        })
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
      const { merchantAccount } = this.options_
      const validInput = validateCapturePaymentInput(input)
      const { reference, sessionResultResponse } = validInput.data
      const payments = sessionResultResponse.payments || []
      const promises = payments.map(({ pspReference, amount }) => {
        if (!pspReference || !amount) return null

        const request: Types.checkout.PaymentCaptureRequest = {
          merchantAccount,
          amount,
          reference,
        }
        const idempotencyKey = pspReference
        return this.checkout.ModificationsApi.captureAuthorisedPayment(
          pspReference,
          request,
          { idempotencyKey },
        )
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
      const { merchantAccount } = this.options_
      const validInput = validateDeleteAccountHolderInput(input)
      const shopperReference = validInput.context.account_holder.id
      const methods = await this.listStoredPaymentMethods_(shopperReference)
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
    } catch (error) {
      this.log('deleteAccountHolder/error', error)
      throw error
    }
  }

  public async deletePayment(
    input: DeletePaymentInput,
  ): Promise<DeletePaymentOutput> {
    this.log('deletePayment/input', input, 'info')
    return { data: {} }
  }

  public async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    this.log('getPaymentStatus/input', input)
    try {
      const validInput = validateGetPaymentStatusInput(input)
      const { sessionId, sessionResult } = validInput.data.sessionsResponse
      const idempotencyKey = sessionId
      const response =
        await this.checkout.PaymentsApi.getResultOfPaymentSession(
          sessionId,
          sessionResult,
          { idempotencyKey },
        )
      const status = getSessionStatus(response.status)
      const data = { ...input.data, sessionResultResponse: response }
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
    try {
      const providerIdentifier = AdyenProviderService.identifier
      const validInput = validateProviderWebhookPayload(input)
      const { notificationItems } = validInput.data
      const validNotifications: Types.notification.NotificationRequestItem[] =
        []
      notificationItems.forEach((notificationItem) => {
        const notification = notificationItem.NotificationRequestItem
        if (this.validateHMAC(notification)) {
          validNotifications.push(notification)
        } else {
          this.log('getWebhookActionAndData/invalidNotification', notification)
        }
      })
      const data = {
        providerIdentifier,
        validNotifications,
        session_id: '',
        amount: 0,
      }
      this.log('getWebhookActionAndData/output', {
        action: PaymentActions.NOT_SUPPORTED,
        data,
      })
      return { action: PaymentActions.NOT_SUPPORTED, data }
    } catch (error) {
      this.log('getWebhookActionAndData/error', error)
      throw error
    }
  }

  public async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    this.log('initiatePayment/input', input)
    try {
      const {
        storePaymentMethodMode,
        recurringProcessingModel,
        shopperInteraction,
        returnUrlPrefix: returnUrl,
        merchantAccount,
      } = this.options_
      const validInput = validateInitiatePaymentInput(input)
      const reference = validInput.reference
      const shopperReference = validInput.context?.account_holder?.id
      const { createCheckoutSessionRequest, sessionsResponse } =
        validInput?.data || {}
      if (sessionsResponse) {
        const data = {
          ...input.data,
          reference,
          session_id: reference,
          sessionsResponse,
        }
        this.log('initiatePayment/output', { data, id: reference })
        return { data, id: reference }
      } else {
        const amount = getAmount(validInput.amount, validInput.currency_code)
        const request: Types.checkout.CreateCheckoutSessionRequest = {
          ...createCheckoutSessionRequest,
          shopperReference,
          amount,
          reference,
          storePaymentMethodMode,
          recurringProcessingModel,
          shopperInteraction,
          returnUrl,
          merchantAccount,
        }
        const idempotencyKey = reference
        const response = await this.checkout.PaymentsApi.sessions(request, {
          idempotencyKey,
        })
        const data = {
          reference,
          session_id: reference,
          createCheckoutSessionRequest: request,
          createCheckoutSessionResponse: response,
        }
        this.log('initiatePayment/output', { data, id: reference })
        return { data, id: reference }
      }
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
      const { merchantAccount } = this.options_
      const validInput = validateRefundPaymentInput(input)
      const {
        reference,
        sessionResultResponse,
        createCheckoutSessionResponse,
      } = validInput.data
      const currency = createCheckoutSessionResponse.amount.currency
      let balance = getMinorUnit(validInput.amount, currency)
      const payments = sessionResultResponse.payments || []
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
        const request: Types.checkout.PaymentRefundRequest = {
          merchantAccount,
          reference,
          amount: newAmount,
        }
        const idempotencyKey = pspReference
        return this.checkout.ModificationsApi.refundCapturedPayment(
          pspReference,
          request,
          { idempotencyKey },
        )
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
   * We don't use this method.
   */
  public async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    return {}
  }

  /**
   * We don't use this method.
   */
  public async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    return { data: input.data }
  }
}

export default AdyenProviderService

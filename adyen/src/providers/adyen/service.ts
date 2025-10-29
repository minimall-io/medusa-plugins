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

import { getAmount, getMinorUnit, getSessionStatus } from '../../utils'

import {
  Options,
  validateCancelPaymentInput,
  validateCancellation,
  validateCapturePaymentInput,
  validateCaptures,
  validateCreateAccountHolderInput,
  validateDeleteAccountHolderInput,
  validateGetPaymentStatusInput,
  validateInitiatePaymentInput,
  validateListPaymentMethodsInput,
  validateOptions,
  validateProviderWebhookPayload,
  validateRefundPaymentInput,
  validateRefunds,
  validateUpdatePaymentInput,
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

    const message = `${title}: ${JSON.stringify(data, null, 2)}`
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
      case 'debug':
        return this.logger_.debug(message)
      default:
        return
    }
  }

  protected validateHMAC_(
    notification: Types.notification.NotificationRequestItem,
  ): boolean {
    const { hmacKey } = this.options_
    // TODO: Uncomment this when we are done with testing
    // return this.hmac.validateHMAC(notification, hmacKey)
    return true
  }

  protected async listStoredPaymentMethods_(
    shopperReference: string,
  ): Promise<Types.checkout.StoredPaymentMethodResource[]> {
    const { merchantAccount } = this.options_
    const idempotencyKey = shopperReference
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
      const { reference } = validInput.data
      const id = validInput.context?.idempotency_key
      // TODO: implement request handling block
      const request: Types.checkout.StandalonePaymentCancelRequest = {
        merchantAccount,
        paymentReference: reference,
        reference,
      }
      const idempotencyKey = reference
      const response =
        await this.checkout.ModificationsApi.cancelAuthorisedPayment(request, {
          idempotencyKey,
        })

      const newCancellation = { ...response, id }
      const cancellation = validateCancellation(newCancellation)
      const data = {
        ...input.data,
        cancellation,
      }
      this.log('cancelPayment/output', { data })
      return { data }
    } catch (error) {
      this.log('cancelPayment/error', error, 'error')
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
      const { reference, authorization, checkoutSession, request } =
        validInput.data
      const id = validInput.context?.idempotency_key
      if (request) {
        const existingCaptures = validInput.data.captures || {}
        const newCaptures = { [request.pspReference]: { ...request, id } }
        this.log('capturePayment/newCapture', newCaptures)
        const captures = {
          ...existingCaptures,
          ...validateCaptures(newCaptures),
        }
        const data = {
          ...input.data,
          captures,
          request: undefined,
        }
        this.log('capturePayment/output', { data })
        return { data }
      }

      const currency = checkoutSession.amount.currency
      const payments = authorization.payments || []
      const validPayments = payments.filter(
        ({ pspReference, amount }) =>
          pspReference && amount && amount.currency === currency,
      ) as { pspReference: string; amount: Types.checkout.Amount }[]
      const paymentsAmount = validPayments.reduce((total, { amount }) => {
        return total + amount!.value
      }, 0)
      const captureAmount = validInput.amount || paymentsAmount
      let balance = getMinorUnit(captureAmount, currency)

      const promises = validPayments.map(({ pspReference, amount }) => {
        if (balance === 0) return null
        const value = amount.value < balance ? amount.value : balance
        balance -= value
        const newAmount: Types.checkout.Amount = {
          currency,
          value,
        }

        const request: Types.checkout.PaymentCaptureRequest = {
          merchantAccount,
          amount: newAmount,
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
      const validResponses = responses.filter(
        (response) => response !== null,
      ) as Types.checkout.PaymentCaptureResponse[]

      const newCaptures = validResponses.reduce(
        (captures, response) =>
          (captures[response.pspReference] = { ...response, id }),
        {},
      )

      const existingCaptures = validInput.data.captures || {}
      const captures = {
        ...existingCaptures,
        ...validateCaptures(newCaptures),
      }
      const data = { ...input.data, captures }
      this.log('capturePayment/output', { data })
      return { data }
    } catch (error) {
      this.log('capturePayment/error', error, 'error')
      throw error
    }
  }

  public async createAccountHolder(
    input: CreateAccountHolderInput,
  ): Promise<CreateAccountHolderOutput> {
    this.log('createAccountHolder/input', input)
    try {
      const validInput = validateCreateAccountHolderInput(input)
      const { id } = validInput.context.customer
      this.log('createAccountHolder/output', { id })
      return { id }
    } catch (error) {
      this.log('createAccountHolder/error', error, 'error')
      throw error
    }
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
        if (!method.id) return
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
      this.log('deleteAccountHolder/error', error, 'error')
      throw error
    }
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
      const data = { ...input.data, authrization: response }
      this.log('getPaymentStatus/output', { data, status })
      return { data, status }
    } catch (error) {
      this.log('getPaymentStatus/error', error, 'error')
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
        const notification =
          notificationItem.NotificationRequestItem as Types.notification.NotificationRequestItem
        if (this.validateHMAC_(notification)) {
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
      this.log('getWebhookActionAndData/error', error, 'error')
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
      const { checkoutSession } = validInput?.data || {}
      const amount = getAmount(validInput.amount, validInput.currency_code)
      const request: Types.checkout.CreateCheckoutSessionRequest = {
        ...checkoutSession,
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
        session_id: validInput.data?.session_id,
        checkoutSession: response,
      }
      this.log('initiatePayment/output', { data, id: reference })
      return { data, id: reference }
    } catch (error) {
      this.log('initiatePayment/error', error, 'error')
      throw error
    }
  }

  public async listPaymentMethods(
    input: ListPaymentMethodsInput,
  ): Promise<ListPaymentMethodsOutput> {
    this.log('listPaymentMethods/input', input)
    try {
      const validInput = validateListPaymentMethodsInput(input)
      const shopperReference = validInput.context.account_holder.data
        .id as string
      const methods = await this.listStoredPaymentMethods_(shopperReference)
      const formattedMethods = methods.map((method, index) => ({
        id: method.id || index.toString(),
        data: method as Record<string, unknown>,
      }))
      this.log('listPaymentMethods/output', formattedMethods)
      return [...formattedMethods]
    } catch (error) {
      this.log('listPaymentMethods/error', error, 'error')
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
      const { reference, authorization, checkoutSession } = validInput.data
      const refundId = validInput.context?.idempotency_key
      const currency = checkoutSession.amount.currency
      let balance = getMinorUnit(validInput.amount, currency)
      const payments = authorization.payments || []
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
      const validResponses = responses.filter(
        (response) => response !== null,
      ) as Types.checkout.PaymentRefundResponse[]

      const newRefunds = validResponses.reduce(
        (captures, response) =>
          (captures[response.pspReference] = { ...response, refundId }),
        {},
      )

      const existingRefunds = validInput.data.refunds || []
      const refunds = {
        ...existingRefunds,
        ...validateRefunds(newRefunds),
      }
      const data = { ...input.data, refunds }
      this.log('refundPayment/output', { data })
      return { data }
    } catch (error) {
      this.log('refundPayment/error', error, 'error')
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

  public async updatePayment(
    input: UpdatePaymentInput,
  ): Promise<UpdatePaymentOutput> {
    this.log('updatePayment/input', input)
    try {
      const validInput = validateUpdatePaymentInput(input)
      const data = { ...input.data, ...validInput.data }
      this.log('updatePayment/output', { data })
      return { data }
    } catch (error) {
      this.log('updatePayment/error', error, 'error')
      throw error
    }
  }
}

export default AdyenProviderService

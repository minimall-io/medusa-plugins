import {
  CheckoutAPI,
  Client,
  HttpClientException,
  hmacValidator,
  type Types,
} from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import type { Logger } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import type { Options } from '../../utils'

type NotificationRequestItem = Types.notification.NotificationRequestItem

interface AdyenAPIOptions extends Options {
  apiInitialRetryDelay: number
  apiMaxRetries: number
}

const API_INITIAL_RETRY_DELAY = 1000
const API_MAX_RETRIES = 3
const MESSAGE_PREFIX = '[Adyen Payment Provider API]'

/**
 * Wraps Adyen CheckoutAPI with automatic retry logic and error transformation.
 * Uses Proxy to intercept method calls on CheckoutAPI and its nested API objects.
 *
 * All API methods automatically:
 * - Retry on transient errors (5xx) with exponential backoff
 * - Transform errors to MedusaError errors
 * - Preserve full type safety
 */
export class AdyenAPI {
  private readonly _checkout: CheckoutAPI
  private readonly log: Logger
  private readonly options: AdyenAPIOptions
  public readonly checkout: CheckoutAPI
  private readonly hmac: hmacValidator

  constructor(options: Options, logger: Logger) {
    const {
      apiKey,
      liveEndpointUrlPrefix,
      apiInitialRetryDelay = API_INITIAL_RETRY_DELAY,
      apiMaxRetries = API_MAX_RETRIES,
      environment = EnvironmentEnum.TEST,
    } = options

    const client = new Client({
      apiKey,
      environment,
      liveEndpointUrlPrefix,
    })
    this._checkout = new CheckoutAPI(client)
    this.options = { ...options, apiInitialRetryDelay, apiMaxRetries }
    this.log = logger
    this.hmac = new hmacValidator()

    // Store a proxied version that maintains type safety
    this.checkout = this.createProxy<CheckoutAPI>(this._checkout)
  }

  private createProxy<T extends object>(target: T): T {
    return new Proxy(target, {
      get: (obj, prop) => {
        const value = Reflect.get(obj, prop)

        // Handle special properties that should not be proxied
        if (prop === 'constructor' || prop === 'prototype') {
          return value
        }

        // If it's a nested API object (RecurringApi, PaymentsApi, etc.), wrap it recursively
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          prop.toString().endsWith('Api')
        ) {
          return this.createProxy(value)
        }

        // If it's a function, wrap it with retry logic and error transformation
        if (typeof value === 'function') {
          return this.wrapMethod(value.bind(obj))
        }

        // Return the value as-is for non-function properties
        return value
      },
    })
  }

  private wrapMethod<T extends (...args: any[]) => Promise<any>>(method: T): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await this.retryWithBackoff(() => method(...args))
      } catch (error) {
        throw this.transformError(error)
      }
    }) as T
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error

    const { apiInitialRetryDelay, apiMaxRetries } = this.options

    for (let attempt = 1; attempt <= apiMaxRetries; attempt += 1) {
      try {
        const result = await fn()
        const message = `${MESSAGE_PREFIX} call succeeded after ${attempt} retries.`
        this.log.debug(message)
        return result
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (4xx)
        if (error instanceof HttpClientException && error.statusCode < 500) {
          throw error
        }

        if (attempt < apiMaxRetries) {
          const delay = apiInitialRetryDelay * 2 ** attempt
          const message = `${MESSAGE_PREFIX} call failed. Error: ${error.message}. Retrying in ${delay}ms (attempt ${attempt + 1}/${apiMaxRetries}).`
          this.log.debug(message)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    const message = `${MESSAGE_PREFIX} call failed after ${apiMaxRetries} attempts. Last error: ${lastError!.message}`
    this.log.error(message)

    throw lastError!
  }

  private transformError(error: unknown): MedusaError {
    if (error instanceof MedusaError) {
      this.log.error(error.message)
      return error
    }

    if (error instanceof HttpClientException) {
      const message = `${MESSAGE_PREFIX} Error: ${error.message}`
      const { statusCode, errorCode } = error
      this.log.error(message)
      return new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        message,
        undefined,
        { errorCode, statusCode },
      )
    }

    if (error instanceof Error) {
      const message = `${MESSAGE_PREFIX} Error: ${error.message}`
      this.log.error(message)
      return new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        message,
        undefined,
        error,
      )
    }

    const message = `${MESSAGE_PREFIX} Error: ${error}`
    this.log.error(message, error as Error)
    return new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      message,
      undefined,
      error,
    )
  }

  get unwrapped(): CheckoutAPI {
    return this._checkout
  }

  public validateWebhookNotification(
    notification: NotificationRequestItem,
  ): boolean {
    const { hmacKey } = this.options
    try {
      const isValid = this.hmac.validateHMAC(notification, hmacKey)
      if (!isValid)
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          'Invalid Webhook Notification',
        )
      return true
    } catch (error) {
      const {
        eventCode,
        merchantReference,
        pspReference,
        eventDate,
        success,
        reason,
      } = notification
      const baseNotification = {
        eventCode,
        eventDate,
        merchantReference,
        pspReference,
        reason,
        success,
      }
      const baseNotificationString = JSON.stringify(baseNotification, null, 2)
      const message = `${MESSAGE_PREFIX} Error: ${error.message}. Notification: ${baseNotificationString}`
      this.log.error(message, error)
    }
    return false
  }
}

export default AdyenAPI

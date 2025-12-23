import { CheckoutAPI, Client, HttpClientException } from '@adyen/api-library'
import { EnvironmentEnum } from '@adyen/api-library/lib/src/config'
import type { Logger } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import type { Options } from '../../utils'

interface RetryOptions extends Options {
  apiInitialRetryDelay: number
  apiMaxRetries: number
}

/**
 * Error context extracted from Adyen errors
 */
interface AdyenErrorContext extends Error {
  statusCode?: number
  errorCode?: string
  pspReference?: string
  errorType?: string
  detail?: string
  invalidFields?: string[]
}

/**
 * Wraps Adyen CheckoutAPI with automatic retry logic and error transformation.
 * Uses Proxy to intercept method calls on CheckoutAPI and its nested API objects.
 *
 * All API methods automatically:
 * - Retry on transient errors (5xx) with exponential backoff
 * - Transform Adyen errors to MedusaError
 * - Preserve full type safety
 */
export class RetryableCheckoutAPI {
  private readonly checkout_: CheckoutAPI
  private readonly logger_: Logger
  private readonly options_: RetryOptions
  public readonly checkout: CheckoutAPI

  constructor(options: Options, logger: Logger) {
    const {
      apiKey,
      liveEndpointUrlPrefix,
      apiInitialRetryDelay = 1000,
      apiMaxRetries = 3,
      environment = EnvironmentEnum.TEST,
    } = options

    const client = new Client({
      apiKey,
      environment,
      liveEndpointUrlPrefix,
    })
    this.checkout_ = new CheckoutAPI(client)
    this.options_ = { ...options, apiInitialRetryDelay, apiMaxRetries }
    this.logger_ = logger

    // Store a proxied version that maintains type safety
    this.checkout = this.createProxy<CheckoutAPI>(this.checkout_)
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

    const { apiInitialRetryDelay, apiMaxRetries } = this.options_

    for (let attempt = 0; attempt <= apiMaxRetries; attempt += 1) {
      try {
        const result = await fn()
        return result
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (4xx)
        if (error instanceof HttpClientException && error.statusCode < 500) {
          throw error
        }

        if (attempt < apiMaxRetries) {
          const delay = apiInitialRetryDelay * 2 ** attempt
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }

  private transformError(error: unknown): MedusaError {
    if (error instanceof MedusaError) {
      this.logger_.error(error.message, error)
      return error
    }

    if (error instanceof Error) {
      const message = `Adyen payment error: ${error.message}`
      this.logger_.error(message, error)
      return new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        message,
        undefined,
        error,
      )
    }

    if (error instanceof HttpClientException) {
      const context = this.extractErrorContext(error)
      const message = `Adyen payment error: ${context.message}`
      this.logger_.error(message, error)
      return new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        message,
        undefined,
        context,
      )
    }

    const message = `Unknown error: ${error}`
    this.logger_.error(message, error as Error)
    return new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      message,
      undefined,
      error,
    )
  }

  private extractErrorContext(error: HttpClientException): AdyenErrorContext {
    let context: AdyenErrorContext = { ...error }

    if (error.responseBody) {
      try {
        const parsed = JSON.parse(error.responseBody) as any
        context = { ...context, ...parsed }
      } catch {
        context = { ...error, ...context }
      }
    }

    if (error.apiError) {
      context = { ...context, ...error.apiError }
    }

    return context
  }

  get unwrapped(): CheckoutAPI {
    return this.checkout_
  }
}

export default RetryableCheckoutAPI

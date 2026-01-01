# Adyen Payment Provider

## Introduction

This plugin implements the Medusa.js payment provider for Adyen payments, providing the backend (Payment server) integration for Adyen's Advanced flow. The plugin handles server-side payment operations including payment session creation, authorization, capture, refunds, and webhook processing.

The plugin is frontend-agnostic and is compatible with any Advanced flow frontend implementation that Adyen supports (Web Components, Drop-in, or custom implementations). A dedicated section with frontend code examples is provided below.

**⚠️ Production Readiness:** This plugin is currently not considered safe or ready for production use due to fundamental differences between Medusa's payment module design (which assumes synchronous payment operations) and Adyen's asynchronous payment protocol. These differences create challenges in maintaining accurate payment state synchronization, as detailed in the [Webhooks](#webhooks) section.

**⚠️ Version Compatibility:** Due to the webhook workflow implementation, this plugin is brittle and tied to the specified Medusa version. There is no guarantee that the plugin will work correctly with other Medusa versions because it uses the payment module's internal methods to operate on payment models. These methods and underlying payment models may change between Medusa versions, potentially breaking the plugin's functionality.

## Installation and Setup

### Install the Package

Install the plugin using npm:

```bash
npm install @minimall.io/medusa-plugin-adyen
```

### Configure the Plugin

Configure the Adyen payment provider in your Medusa instance's `medusa-config.ts` file:

```typescript
import { defineConfig } from '@medusajs/framework/utils'

export default defineConfig({
  // ... other configurations
  plugins: [
    {
      resolve: '@minimall.io/medusa-plugin-adyen',
      options: {},
    },
  ],
  modules: [
    {
      resolve: '@medusajs/medusa/payment',
      options: {
        providers: [
          {
            resolve: '@minimall.io/medusa-plugin-adyen/providers/adyen',
            id: 'adyen', // Your provider ID
            options: {
              apiKey: process.env.ADYEN_API_KEY,
              hmacKey: process.env.ADYEN_HMAC_KEY,
              merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
              liveEndpointUrlPrefix: process.env.ADYEN_LIVE_ENDPOINT_URL_PREFIX,
              environment: process.env.ADYEN_ENVIRONMENT,
              shopperInteraction: process.env.ADYEN_SHOPPER_INTERACTION,
              recurringProcessingModel: process.env.ADYEN_RECURRING_PROCESSING_MODEL,
            },
          },
        ],
      },
    },
  ],
})
```

### Plugin Options

The following options are available for the Adyen payment provider:

#### Required Options

- **`apiKey`** (string): Your Adyen API key for authenticating API requests. See [Adyen documentation](https://docs.adyen.com/development-resources/api-credentials) for details.
- **`hmacKey`** (string): HMAC key for validating webhook notifications. Required for secure webhook processing. See [Adyen documentation](https://docs.adyen.com/development-resources/webhooks/secure-webhooks) for details.
- **`merchantAccount`** (string): Your Adyen merchant account identifier.
- **`liveEndpointUrlPrefix`** (string): Your live endpoint URL prefix. Required when using the live environment. See [Adyen documentation](https://docs.adyen.com/development-resources/live-endpoints) for details.

#### Optional Options

- **`environment`** (string): Adyen environment to use. Defaults to `TEST`. Set to `LIVE` for production. Must match your API credentials' environment.
- **`shopperInteraction`** (string): Shopper interaction type for payments. Takes precedence over values specified in payment requests. See Adyen documentation for [available values](https://docs.adyen.com/api-explorer/Checkout/71/post/payments#request-shopperInteraction) and [creating a token](https://docs.adyen.com/online-payments/tokenization/create-tokens?tab=payments-create-a-token_2).
- **`recurringProcessingModel`** (string): Recurring processing model for stored payment methods. Takes precedence over values specified in payment requests. See Adyen documentation for [available values](https://docs.adyen.com/api-explorer/Checkout/71/post/payments#request-recurringProcessingModel) and [creating a token](https://docs.adyen.com/online-payments/tokenization/create-tokens?tab=payments-create-a-token_2).
- **`apiInitialRetryDelay`** (number): Initial delay in milliseconds before retrying failed API requests. Defaults to `1000` (1 second).
- **`apiMaxRetries`** (number): Maximum number of retry attempts for failed API requests. Defaults to `3`.

**Note:** The provider-level `shopperInteraction` and `recurringProcessingModel` options take precedence over values specified in individual payment requests. If not set at the provider level, the values from the payment request will be used.

## Webhooks

Webhooks are critical for the Adyen payment provider integration. The Medusa payment module assumes payment operations return definitive states synchronously, but Adyen operates asynchronously.

### Asynchronous Payment Operations

When merchant infrastructure (Medusa server) sends a payment operation API call to Adyen (authorization, cancellation, capture, or refund), Adyen typically only acknowledges receipt of the request—it does not immediately indicate whether the operation succeeded or failed. The actual outcome is delivered later via a webhook notification from Adyen to the merchant Medusa server.

#### How the Plugin Handles This

To work around Medusa's synchronous assumptions, the plugin:

1. **Initially treats request acknowledgements as successful payment operations**: When Adyen acknowledges a payment operation request, the plugin records it as a successful operation in Medusa (e.g., setting capture status to `REQUESTED`).

2. **Updates a payment state via webhooks**: When the corresponding webhook arrives, the plugin Adyen Webhook workflow processes the notification and updates the final state of the payment records in Medusa (payment collections, payment sessions, payments, captures, refunds, and related entities).

This ensures Medusa payment records stay synchronized with Adyen's actual payment states.

#### Important Considerations

**Operations may appear successful but ultimately fail.** A payment operation that initially appears successful may fail when the webhook arrives.

Currently, there is no notification system in place to notify merchants about received webhooks. Merchants should rely on webhooks for processing orders and should not take irreversible actions (such as shipping goods) until webhook notifications confirm that payment operations have succeeded. The plugin's webhook workflow automatically synchronizes payment states, but merchant business logic should wait for webhook confirmation before taking irreversible actions.

## Development

### Integration Tests

The integration tests depend on two environment variables:

- **`ADYEN_PROVIDER_ID`** (required): Represents the `id` portion of the payment provider unique ID (`pp_{identifier}_{id}`). The payment module service calls, consumed by the integration tests, depend on the payment provider ID. This variable must match the value of `config.modules[i].options.providers[j].id` in the `medusa-config.ts` file of the Medusa store.

- **`ADYEN_API_LIVE_TESTS`** (optional): A boolean value that determines whether integration tests use live Adyen API endpoints. Set to `'true'` to use live endpoints, or `'false'` or leave undefined to use mocks. Using mocks is recommended for consistent testing.

### Example Storefront

The `examples` folder contains a Medusa storefront (frontend) with Adyen integration. The example was built using the Medusa Next.js Starter Storefront code as the base. The code is not intended for production use, but can be useful for manual end-to-end testing of the plugin and as inspiration for integrating Adyen payments with Medusa storefronts.
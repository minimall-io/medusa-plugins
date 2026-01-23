# Adyen Payment Provider

## Introduction

This plugin implements a [Medusa.js](https://medusajs.com/) payment [provider](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider) for [Adyen](https://www.adyen.com/), delivering backend (payment server) integration for [Adyen’s Advanced flow](https://docs.adyen.com/online-payments/build-your-integration/advanced-flow). It handles server-side payment operations such as payment session creation, authorization, capture, refunds, and webhook processing.

The plugin is frontend-agnostic and compatible with any Advanced flow frontend implementation supported by Adyen, including Web Components, Drop-in, and custom integrations. A dedicated section with frontend code examples is provided below.

**⚠️ Production Readiness:** This plugin is not currently considered safe or ready for production use. Fundamental differences between Medusa’s payment module design—which assumes synchronous payment operations—and Adyen’s asynchronous payment protocol introduce challenges in maintaining accurate payment state synchronization. These issues are explained in more detail in the [Webhooks](#webhooks) section.

**⚠️ Version Compatibility:** Due to its webhook workflow implementation, this plugin is brittle and tightly coupled to a specific Medusa version. There is no guarantee it will function correctly with other Medusa versions, as it relies on internal payment module methods to manipulate payment models. These methods and underlying models may change between Medusa releases, potentially breaking the plugin.

## Installation and Setup

### Install the Package

Install the plugin using npm:

```bash
npm install @minimall.io/medusa-plugin-adyen
```

### Configure the Plugin

Configure the Adyen [payment provider](https://docs.medusajs.com/resources/commerce-modules/payment/module-options#providers-option) in your Medusa instance by updating the `medusa-config.ts` file:

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

The following options are available for configuring the Adyen payment provider.

#### Required Options

- **`apiKey`** (string): Your Adyen API key, used to authenticate API requests. See the [Adyen documentation](https://docs.adyen.com/development-resources/api-credentials).
- **`hmacKey`** (string): HMAC key used to validate webhook notifications. Required for secure webhook processing. See the [Adyen documentation](https://docs.adyen.com/development-resources/webhooks/secure-webhooks).
- **`merchantAccount`** (string): Your Adyen merchant account identifier.
- **`liveEndpointUrlPrefix`** (string): Your live endpoint URL prefix. Required when using the live environment. See the [Adyen documentation](https://docs.adyen.com/development-resources/live-endpoints).

#### Optional Options

- **`environment`** (string): The Adyen environment to use. Defaults to `TEST`. Set to `LIVE` for production. This must match the environment of your API credentials.
- **`shopperInteraction`** (string): Shopper interaction type for payments. This value takes precedence over any value specified in individual payment requests. See the Adyen documentation for [available values](https://docs.adyen.com/api-explorer/Checkout/71/post/payments#request-shopperInteraction) and [token creation](https://docs.adyen.com/online-payments/tokenization/create-tokens?tab=payments-create-a-token_2).
- **`recurringProcessingModel`** (string): Recurring processing model for stored payment methods. This value also takes precedence over values specified in payment requests. Refer to the Adyen documentation for [available values](https://docs.adyen.com/api-explorer/Checkout/71/post/payments#request-recurringProcessingModel) and [token creation](https://docs.adyen.com/online-payments/tokenization/create-tokens?tab=payments-create-a-token_2).
- **`apiInitialRetryDelay`** (number): Initial delay, in milliseconds, before retrying failed API requests. Defaults to `1000` (1 second).
- **`apiMaxRetries`** (number): Maximum number of retry attempts for failed API requests. Defaults to `3`.

**Note:** Provider-level `shopperInteraction` and `recurringProcessingModel` options override values specified in individual payment requests. If these options are not set at the provider level, the values from the payment request will be used.

## Webhooks

Webhooks are a critical component of the Adyen payment provider integration. While the Medusa payment module assumes payment operations return definitive results synchronously, Adyen operates using an asynchronous model.

### Asynchronous Payment Operations

When merchant infrastructure (the Medusa server) sends a payment operation request to Adyen—such as authorization, cancellation, capture, or refund—Adyen typically responds only with an acknowledgement of receipt. It does not immediately indicate whether the operation succeeded or failed. The final outcome is delivered later via a webhook notification from Adyen to the Medusa server.

#### How the Plugin Handles This

To accommodate Medusa’s synchronous assumptions, the plugin implements the following approach:

1. **Treats request acknowledgements as initial success states:** When Adyen acknowledges a payment operation request, the plugin records the operation as successful in Medusa (for example, setting a capture status to `REQUESTED`).

2. **Finalizes payment state via webhooks:** When the corresponding webhook is received, the plugin’s Adyen webhook workflow processes the notification and updates the final state of the relevant Medusa entities, including payment collections, payment sessions, payments, captures, refunds, and related records.

This approach helps keep Medusa’s payment records synchronized with Adyen’s actual payment states.

#### Important Considerations

**Operations may initially appear successful but ultimately fail.** A payment operation that is initially recorded as successful may later fail when the webhook notification is processed.

Currently, the plugin does not provide a notification mechanism to alert merchants when webhooks are received. Merchants should rely on webhook-confirmed payment states when processing orders and must avoid taking irreversible actions—such as shipping goods—until webhook notifications confirm that payment operations have completed successfully. While the plugin automatically synchronizes payment states, merchant business logic should explicitly wait for webhook confirmation before proceeding.

## Development

### Integration Tests

Integration tests depend on the following environment variables:

- **`ADYEN_PROVIDER_ID`** (required): Represents the `id` portion of the payment provider’s unique identifier (`pp_{identifier}_{id}`). Payment module service calls used by the integration tests rely on this value. It must match the value defined in `config.modules[i].options.providers[j].id` within the `medusa-config.ts` file.
- **`ADYEN_API_LIVE_TESTS`** (optional): A boolean flag that determines whether integration tests use live Adyen API endpoints. Set to `'true'` to use live endpoints, or `'false'` (or leave undefined) to use mocked responses. Using mocks is recommended for consistent and reliable testing.

### Example Storefront

The [`examples`](https://github.com/minimall-io/medusa-plugins/tree/main/examples) folder contains a Medusa storefront with Adyen integration. This example is based on the Medusa Next.js Starter Storefront and is not intended for production use. However, it can be useful for manual end-to-end testing of the plugin and as a reference for integrating Adyen payments into Medusa storefronts.

### Known Issues

The [`BUGS.md`](https://github.com/minimall-io/medusa-plugins/blob/main/adyen/BUGS.md) file documents issues with Medusa that were encountered during plugin development. These include problems with the payment module's design, method implementations, and integration test infrastructure. The file also contains recommended fixes and workarounds for some of these issues.
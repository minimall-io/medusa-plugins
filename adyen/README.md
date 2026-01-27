# Adyen Payment Provider

## Table of Contents

- [Introduction](#introduction)
- [Installation and Setup](#installation-and-setup)
  - [Install the Package](#install-the-package)
  - [Configure the Plugin](#configure-the-plugin)
  - [Plugin Options](#plugin-options)
    - [Required Options](#required-options)
    - [Optional Options](#optional-options)
- [Webhooks](#webhooks)
  - [Asynchronous Payment Operations](#asynchronous-payment-operations)
    - [How the Plugin Handles This](#how-the-plugin-handles-this)
    - [Important Considerations](#important-considerations)
- [PCI Compliance Considerations](#pci-compliance-considerations)
- [Development](#development)
  - [Integration Tests](#integration-tests)
  - [Example Storefront](#example-storefront)
  - [Known Issues](#known-issues)

## Introduction

This plugin implements a [Medusa.js](https://medusajs.com/) [payment provider](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider) for [Adyen](https://www.adyen.com/), delivering backend (payment server) integration for [Adyen’s Advanced flow](https://docs.adyen.com/online-payments/build-your-integration/advanced-flow). It handles server-side payment operations such as payment session creation, authorization, capture, refunds, and webhook processing.

The plugin is frontend-agnostic and compatible with any Advanced flow frontend implementation supported by Adyen, including Web Components, Drop-in, and custom integrations. A dedicated section with frontend code examples is provided below.

**⚠️ Production Readiness:** This plugin is not currently considered safe or ready for production use. Fundamental differences between Medusa’s payment module design, which assumes synchronous payment operations, and Adyen’s asynchronous payment protocol introduce challenges in maintaining accurate payment state synchronization. Additionally, the integration requires storing sensitive payment data on the Medusa server, which may pose PCI compliance risks. These issues are explained in more detail in the [Webhooks](#webhooks) and [PCI Compliance Considerations](#pci-compliance-considerations) sections.

**⚠️ Version Compatibility:** Due to its webhook workflow implementation, this plugin is brittle and tightly coupled to a specific Medusa version. There is no guarantee it will function correctly with other Medusa versions, as it relies on internal payment module methods to manipulate payment models. These methods and underlying models may change between Medusa releases, potentially breaking the plugin.

## Installation and Setup

### Install the Package

Install the plugin using npm:

```bash
npm install @minimall.io/medusa-plugin-adyen
```

### Configure the Plugin

Configure the Medusa [Payment Module Options](https://docs.medusajs.com/resources/commerce-modules/payment/module-options) with the Adyen payment provider in your Medusa instance by updating the `medusa-config.ts` file:

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
- **`merchantAccount`** (string): Your Adyen merchant account identifier. See the [Adyen documentation](https://docs.adyen.com/account/account-structure#merchant-accounts).
- **`liveEndpointUrlPrefix`** (string): Your live endpoint URL prefix. Required when using the live environment. See the [Adyen documentation](https://docs.adyen.com/development-resources/live-endpoints).

#### Optional Options

- **`environment`** (string): The Adyen environment to use. Defaults to `TEST`. Set to `LIVE` for production. This must match the environment of your API credentials.
- **`shopperInteraction`** (string): Shopper interaction type for payments. Refer to the Adyen documentation for [available values](https://docs.adyen.com/api-explorer/Checkout/71/post/payments#request-shopperInteraction) and [token creation](https://docs.adyen.com/online-payments/tokenization/create-tokens?tab=payments-create-a-token_2).
- **`recurringProcessingModel`** (string): Recurring processing model for stored payment methods. Refer to the Adyen documentation for [available values](https://docs.adyen.com/api-explorer/Checkout/71/post/payments#request-recurringProcessingModel) and [token creation](https://docs.adyen.com/online-payments/tokenization/create-tokens?tab=payments-create-a-token_2).
- **`apiInitialRetryDelay`** (number): Initial delay, in milliseconds, before retrying failed API requests. Defaults to `1000` (1 second).
- **`apiMaxRetries`** (number): Maximum number of retry attempts for failed API requests. Defaults to `3`.

**Note:** Provider-level `shopperInteraction` and `recurringProcessingModel` options override values specified in individual payment requests. If these options are not set at the provider level, the values from the payment request will be used.

## Webhooks

Webhooks are a critical component of the Adyen payment provider integration. While the Medusa payment module assumes payment operations return definitive results synchronously, Adyen operates using an asynchronous model.

### Asynchronous Payment Operations

When merchant infrastructure (a Medusa server) sends a payment operation API request to Adyen—such as authorization, cancellation, capture, or refund—Adyen typically responds only with an acknowledgement of receipt. It does not immediately indicate whether the operation succeeded or failed. The final outcome is delivered later via a webhook notification from Adyen to the Medusa server.

#### How the Plugin Handles This

To accommodate Medusa’s synchronous assumptions, the plugin implements the following approach:

1. **Treats request acknowledgements as initial success states:** When the Adyen API acknowledges a payment operation request with the response `status` field set to `received`, the plugin updates the payment (`Payment`) `data` field to reflect the current response state and returns it, along with other relevant information, to the Medusa Payment Module to indicate a successful operation.

2. **Finalizes payment state via webhooks:** When the corresponding webhook is received, the plugin’s Adyen webhook workflow processes the notification and updates the final state of the relevant Medusa entities, including payment collections, payment sessions, payments, captures, refunds, and related records.

This approach helps keep Medusa’s payment records synchronized with Adyen’s actual payment states.

#### Important Considerations

**Operations may initially appear successful but ultimately fail.** A payment operation that is initially recorded as successful may later fail when the webhook notification is processed.

Currently, the plugin does not provide a notification mechanism to alert merchants when webhooks are received. As a result, the transaction's state must be determined by manually inspecting the payment `data` field in the order's JSON structure (`payment_collections[i].payments[j].data.events[k].status`). The `status` field can have one of the following values: `REQUESTED`, `FAILED`, or `SUCCEEDED`. A `status` value of `REQUESTED` indicates that the operation request has been received by Adyen and corresponds to Adyen’s response `status` value of `received`; however, the corresponding webhook has not yet been received. Merchants should rely on webhook-confirmed payment states when processing orders and must avoid taking irreversible actions until webhook notifications confirm that payment operations have completed successfully. While the plugin automatically synchronizes payment states, merchant business logic should explicitly wait for webhook confirmation before proceeding.

## PCI Compliance Considerations

Adyen's Advanced flow allows the [`/payments`](https://docs.adyen.com/api-explorer/Checkout/latest/post/payments) Checkout API request, which carries sensitive payment data, to originate from merchant infrastructure (a Medusa server). To ensure security, Adyen provides frontend-side encryption of sensitive payment data, which the Medusa server uses when initiating the authorization request to the `/payments` Adyen API endpoint.

However, Medusa's payment module `authorizePaymentSession` method, which initiates payment authorization, does not accept client-provided `data` value at the time of invocation. Instead, it retrieves and forwards the `data` value already stored in the associated payment session (`PaymentSession`). This requires sensitive payment data to be present in the session's `data` field prior to authorization.

Consequently, sensitive payment data must be transmitted from the frontend before authorization is initiated, typically through Medusa Payment Module session APIs (for example, `updatePayment`). This results in sensitive payment data persisting on the Medusa server, which may introduce PCI compliance risks.

To minimize the retention period of sensitive data, the plugin reacts upon receiving the first related webhook notification by overwriting the payment session `data` field with values drawn from the corresponding payment (`Payment`) `data` field, which do not contain payment details.

To improve the chances of PCI compliance clearance, it is highly advised to leverage Adyen's frontend encryption for sensitive payment data fields.

## Development

### Integration Tests

Integration tests depend on the following environment variables:

- **`ADYEN_PROVIDER_ID`** (required): Represents the `id` portion of the payment provider’s unique identifier (`pp_{identifier}_{id}`). Payment module service calls used by the integration tests rely on this value. It must match the value defined in `config.modules[i].options.providers[j].id` within the `medusa-config.ts` file.
- **`ADYEN_API_LIVE_TESTS`** (optional): A boolean flag that determines whether integration tests use live Adyen API endpoints. Set to `'true'` to use live endpoints, or `'false'` (or leave undefined) to use mocked responses. Using mocks is recommended for consistent and reliable testing.

### Example Storefront

The [`examples`](https://github.com/minimall-io/medusa-plugins/tree/main/examples) folder contains a Medusa storefront with Adyen integration. This example is based on the Medusa Next.js Starter Storefront and is not intended for production use. However, it can be useful for manual end-to-end testing of the plugin and as a reference for integrating Adyen payments into Medusa storefronts.

### Known Issues

The [`BUGS.md`](https://github.com/minimall-io/medusa-plugins/blob/main/adyen/BUGS.md) file documents issues with Medusa that were encountered during plugin development. These include problems with the payment module's design, method implementations, and integration test infrastructure. The file also contains recommended fixes and workarounds for some of these issues.
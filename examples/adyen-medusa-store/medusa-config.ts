import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  plugins: [
    {
      resolve: "@minimall.io/medusa-plugin-adyen",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
          {
            resolve: "@minimall.io/medusa-plugin-adyen/providers/adyen",
            id: process.env.ADYEN_PROVIDER_ID,
            options: {
              apiKey: process.env.ADYEN_API_KEY,
              hmacKey: process.env.ADYEN_HMAC_KEY,
              merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
              liveEndpointUrlPrefix:
                process.env.ADYEN_LIVE_ENDPOINT_URL_PREFIX,
              environment: process.env.ADYEN_ENVIRONMENT,
              shopperInteraction: process.env.ADYEN_SHOPPER_INTERACTION,
              recurringProcessingModel:
                process.env.ADYEN_RECURRING_PROCESSING_MODEL,
            },
          },
        ],
      },
    },
  ],
})

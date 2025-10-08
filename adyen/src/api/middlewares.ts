import { authenticate, defineMiddlewares } from '@medusajs/framework/http'

const middlewares = defineMiddlewares({
  routes: [
    {
      matcher: '/store/payment-methods/:account_holder_id',
      methods: ['GET'],
      middlewares: [authenticate('customer', ['bearer', 'session'])],
    },
  ],
})

export default middlewares

import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
} from '@medusajs/framework/http'
import { UpdatePaymentSessionSchema } from './store/adyen/payment-sessions/[payment_session_id]/validators'

const middlewares = defineMiddlewares({
  routes: [
    {
      matcher: '/store/payment-methods/:account_holder_id',
      methods: ['GET'],
      middlewares: [authenticate('customer', ['bearer', 'session'])],
    },
    {
      matcher: '/store/adyen/payment-sessions/:payment_session_id',
      methods: ['POST'],
      middlewares: [
        authenticate('customer', ['bearer', 'session']),
        validateAndTransformBody(UpdatePaymentSessionSchema),
      ],
    },
  ],
})

export default middlewares

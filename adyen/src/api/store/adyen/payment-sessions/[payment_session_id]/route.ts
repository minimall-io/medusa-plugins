import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import { z } from 'zod'

import { UpdatePaymentSessionSchema } from './validators'

type UpdatePaymentSession = z.infer<typeof UpdatePaymentSessionSchema>

export const POST = async (
  req: MedusaRequest<UpdatePaymentSession>,
  res: MedusaResponse,
) => {
  const { payment_session_id } = req.params
  const { data } = req.validatedBody
  const paymentService = req.scope.resolve(Modules.PAYMENT)

  const paymentSession =
    await paymentService.retrievePaymentSession(payment_session_id)

  if (!paymentSession) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Payment session not found!',
    )
  }

  const newSession = {
    ...paymentSession,
    data: { ...paymentSession.data, ...data },
  }

  const updatedPaymentSession =
    await paymentService.updatePaymentSession(newSession)

  res.json({
    payment_session: updatedPaymentSession,
  })
}

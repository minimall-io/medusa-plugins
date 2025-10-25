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
  const paymentModuleService = req.scope.resolve(Modules.PAYMENT)

  const paymentSession =
    await paymentModuleService.retrievePaymentSession(payment_session_id)

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
    await paymentModuleService.updatePaymentSession(newSession)

  res.json({
    payment_session: updatedPaymentSession,
  })
}

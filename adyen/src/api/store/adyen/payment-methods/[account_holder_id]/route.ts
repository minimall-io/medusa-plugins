import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import type { z } from 'zod'
import type { CreatePaymentMethodsSchema } from './validators'

type CreatePaymentMethods = z.infer<typeof CreatePaymentMethodsSchema>

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { account_holder_id } = req.params

  const query = req.scope.resolve('query')
  const paymentService = req.scope.resolve(Modules.PAYMENT)

  const {
    data: [accountHolder],
  } = await query.graph({
    entity: 'account_holder',
    fields: ['provider_id', 'external_id'],
    filters: {
      id: account_holder_id,
    },
  })

  if (!accountHolder) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Account holder not found!',
    )
  }

  const paymentMethods = await paymentService.listPaymentMethods({
    context: {
      account_holder: {
        data: {
          external_id: accountHolder.external_id,
        },
      },
    },
    provider_id: accountHolder.provider_id,
  })

  res.json({
    payment_methods: paymentMethods,
  })
}

export const POST = async (
  req: MedusaRequest<CreatePaymentMethods>,
  res: MedusaResponse,
) => {
  const { account_holder_id } = req.params
  const { data } = req.validatedBody

  const query = req.scope.resolve('query')
  const paymentService = req.scope.resolve(Modules.PAYMENT)

  const {
    data: [accountHolder],
  } = await query.graph({
    entity: 'account_holder',
    fields: ['provider_id', 'external_id'],
    filters: {
      id: account_holder_id,
    },
  })

  if (!accountHolder) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Account holder not found!',
    )
  }

  const paymentMethods = await paymentService.createPaymentMethods([
    {
      context: {
        account_holder: {
          data: {
            external_id: accountHolder.external_id,
          },
        },
      },
      data,
      provider_id: accountHolder.provider_id,
    },
  ])

  res.json({
    payment_methods: paymentMethods,
  })
}

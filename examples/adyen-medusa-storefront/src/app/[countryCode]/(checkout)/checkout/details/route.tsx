import { type NextRequest, NextResponse } from 'next/server'
import {
  placeOrder,
  updatePaymentSession,
  retrieveCart,
} from '@lib/data/cart'
import { getPaymentResponse } from '@lib/util/payment-response'
import { getSession } from '@lib/util/get-session'

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const cartId = searchParams.get('cartId')
  const sessionId = searchParams.get('sessionId')
  console.log('checkout/details/searchParams', searchParams)
  if (!sessionId) {
    return new NextResponse('Missing sessionId', { status: 400 })
  }
  if (!cartId) {
    return new NextResponse('Missing cartId', { status: 400 })
  }

  const cart = await retrieveCart(cartId)
  const session = getSession(cart?.payment_collection, sessionId)

  const paymentResponse = getPaymentResponse(session?.data.paymentResponse)
  const actionData = paymentResponse?.action?.data

  const details = searchParams.entries().reduce((acc: Record<string, string>, [key, value]) => {
    if (key === 'cartId') return acc
    if (key === 'sessionId') return acc
    acc[key] = value
    return acc
  }, {})



  const data = { detailsRequest: { details: { ...actionData, ...details } } }
  console.log('checkout/details/data', data)

  await updatePaymentSession(sessionId, data)
  const response = await placeOrder(cartId)
  return NextResponse.json(response)
}

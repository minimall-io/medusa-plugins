import { type NextRequest, NextResponse } from 'next/server'
import {
  placeOrder,
  updatePaymentSession,
} from '@lib/data/cart'
import { handlePaymentResponse } from '@lib/util/handle-payment-response'
import { getSession } from '@lib/util/get-session'

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const cartId = searchParams.get('cartId')
  const sessionId = searchParams.get('sessionId')
  const redirectResult = searchParams.get('redirectResult')
  console.log('checkout/details/searchParams', searchParams)
  console.log('checkout/details/cartId', cartId)
  console.log('checkout/details/sessionId', sessionId)
  console.log('checkout/details/redirectResult', redirectResult)
  if (!sessionId) {
    return new NextResponse('Missing sessionId', { status: 400 })
  }
  if (!cartId) {
    return new NextResponse('Missing cartId', { status: 400 })
  }

  const data = { detailsRequest: { details: { redirectResult } } }
  console.log('checkout/details/data', data)

  await updatePaymentSession(sessionId, data)
  const response = await placeOrder(cartId)
  // const session = getSession(response.payment_collection, sessionId)
  // console.log('checkout/details/response', response)
  // console.log('checkout/details/session', session)
  // handlePaymentResponse(session?.data.paymentResponse)

  return NextResponse.json(response)
}

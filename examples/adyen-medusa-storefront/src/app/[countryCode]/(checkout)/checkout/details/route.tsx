import { type NextRequest, NextResponse } from 'next/server'
import {
  placeOrder,
  updatePaymentSession,
} from '@lib/data/cart'

export const POST = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')
  const MD = searchParams.get('MD')
  const PaRes = searchParams.get('PaRes')
  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 })
  }

  const data = { detailsRequest: { details: { MD, PaRes } } }

  await updatePaymentSession(sessionId, data)
  const response = await placeOrder()
  return NextResponse.json(response)
}

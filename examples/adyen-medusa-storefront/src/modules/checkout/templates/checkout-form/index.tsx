import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

interface Props {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}

export default async function CheckoutForm({ cart, customer }: Props) {
  if (!cart) return null

  const shippingMethods = await listCartShippingMethods(cart.id)
  const providers = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!shippingMethods || !providers) return null

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment cart={cart} providers={providers} />

      <Review cart={cart} />
    </div>
  )
}

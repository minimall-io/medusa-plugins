import { Text } from "@medusajs/ui"
import { IStripePayment } from "@modules/checkout/hooks"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { CardElement } from "@stripe/react-stripe-js"
import { StripeCardElementOptions } from "@stripe/stripe-js"

interface Props {
  payment: IStripePayment
}

const options: StripeCardElementOptions = {
  style: {
    base: {
      fontFamily: "Inter, sans-serif",
      color: "#424270",
      "::placeholder": {
        color: "rgb(107 114 128)",
      },
    },
  },
  classes: {
    base: "pt-3 pb-1 block w-full h-11 px-4 mt-0 bg-ui-bg-field border rounded-md appearance-none focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active border-ui-border-base hover:bg-ui-bg-field-hover transition-all duration-300 ease-in-out",
  },
}

const StripeProviderOption = ({ payment }: Props) => {
  const { config } = payment

  if (!config) return <SkeletonCardDetails />

  return (
    <div className="my-4 transition-all duration-150 ease-in-out">
      <Text className="txt-medium-plus text-ui-fg-base mb-1">
        Enter your card details:
      </Text>
      <CardElement options={options} onChange={config.onChange} />
    </div>
  )
}

export default StripeProviderOption

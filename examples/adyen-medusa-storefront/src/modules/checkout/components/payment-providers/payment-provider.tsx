import { Radio as RadioGroupOption } from "@headlessui/react"
import { paymentInfoMap } from "@lib/constants"
import { Text, clx } from "@medusajs/ui"
import {
  IAdyenPayment,
  IPaymentProvider,
  IStripePayment,
} from "@modules/checkout/hooks"
import Radio from "@modules/common/components/radio"
import PaymentTest from "../payment-test"
import AdyenCardPaymentProviderOption from "./adyen-provider"
import StripeCardPaymentProviderOption from "./stripe-provider"

interface Props {
  providerId: string
  paymentProvider: IPaymentProvider<unknown>
  selected: boolean
  disabled?: boolean
}

const isDevelopment = process.env.NODE_ENV === "development"

const PaymentProviderOption = ({
  providerId,
  paymentProvider,
  selected,
  disabled = false,
}: Props) => {
  const { id, payment, isAdyen, isStripe, isManual } = paymentProvider
  const isActive = id === providerId
  const isTesting = isManual && isDevelopment
  const title = paymentInfoMap[providerId]?.title || providerId
  const icon = paymentInfoMap[providerId]?.icon

  return (
    <RadioGroupOption
      key={providerId}
      value={providerId}
      disabled={disabled}
      className={clx(
        "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
        {
          "border-ui-border-interactive": selected,
        }
      )}
    >
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-x-4">
          <Radio checked={selected} />
          <Text className="text-base-regular">{title}</Text>
          {isTesting && <PaymentTest className="hidden small:block" />}
        </div>
        <span className="justify-self-end text-ui-fg-base">{icon}</span>
      </div>
      {isTesting && <PaymentTest className="small:hidden text-[10px]" />}
      {isActive && payment && isAdyen && (
        <AdyenCardPaymentProviderOption payment={payment as IAdyenPayment} />
      )}
      {isActive && payment && isStripe && (
        <StripeCardPaymentProviderOption payment={payment as IStripePayment} />
      )}
    </RadioGroupOption>
  )
}

export default PaymentProviderOption

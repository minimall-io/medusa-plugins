"use client"

import { Radio as RadioGroupOption } from "@headlessui/react"
import { getPaymentInfo } from "@lib/constants"
import { Text, clx } from "@medusajs/ui"
import {
  IAdyenPaymentProvider,
  IPaymentProviders,
  IStripePaymentProvider,
} from "@modules/checkout/hooks"
import Radio from "@modules/common/components/radio"
import PaymentTest from "../payment-test"
import AdyenCardPaymentProviderOption from "./adyen-provider"
import StripeCardPaymentProviderOption from "./stripe-provider"

interface Props {
  providerId: string
  paymentProviders: IPaymentProviders
  disabled?: boolean
}

const isDevelopment = process.env.NODE_ENV === "development"

const PaymentProviderOption = ({
  providerId,
  paymentProviders,
  disabled = false,
}: Props) => {
  const { id, provider, isAdyen, isStripe, isManual } = paymentProviders
  const isActive = id === providerId
  const isTesting = isManual && isDevelopment && isActive
  const {title, icon} = getPaymentInfo(providerId)

  return (
    <RadioGroupOption
      key={providerId}
      value={providerId}
      disabled={disabled}
      className={clx(
        "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
        {
          "border-ui-border-interactive": isActive,
        }
      )}
    >
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-x-4">
          <Radio checked={isActive} />
          <Text className="text-base-regular">{title}</Text>
          {isTesting && <PaymentTest className="hidden small:block" />}
        </div>
        <span className="justify-self-end text-ui-fg-base">{icon}</span>
      </div>
      {isTesting && <PaymentTest className="small:hidden text-[10px]" />}
      {isActive && provider && isAdyen && (
        <AdyenCardPaymentProviderOption provider={provider as IAdyenPaymentProvider} />
      )}
      {isActive && provider && isStripe && (
        <StripeCardPaymentProviderOption provider={provider as IStripePaymentProvider} />
      )}
    </RadioGroupOption>
  )
}

export default PaymentProviderOption

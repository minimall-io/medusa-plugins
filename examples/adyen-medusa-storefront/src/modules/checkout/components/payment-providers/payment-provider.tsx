import { Radio as RadioGroupOption } from "@headlessui/react"
import { isManual } from "@lib/constants"
import { Text, clx } from "@medusajs/ui"
import Radio from "@modules/common/components/radio"
import React, { type JSX } from "react"
import PaymentTest from "../payment-test"

interface Props {
  providerId: string
  selectedProviderId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  children?: React.ReactNode
}

const isDevelopment = process.env.NODE_ENV === "development"

const PaymentProviderOption = ({
  providerId,
  selectedProviderId,
  paymentInfoMap,
  disabled = false,
  children,
}: Props) => (
  <RadioGroupOption
    key={providerId}
    value={providerId}
    disabled={disabled}
    className={clx(
      "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
      {
        "border-ui-border-interactive": selectedProviderId === providerId,
      }
    )}
  >
    <div className="flex items-center justify-between ">
      <div className="flex items-center gap-x-4">
        <Radio checked={selectedProviderId === providerId} />
        <Text className="text-base-regular">
          {paymentInfoMap[providerId]?.title || providerId}
        </Text>
        {isManual(providerId) && isDevelopment && (
          <PaymentTest className="hidden small:block" />
        )}
      </div>
      <span className="justify-self-end text-ui-fg-base">
        {paymentInfoMap[providerId]?.icon}
      </span>
    </div>
    {isManual(providerId) && isDevelopment && (
      <PaymentTest className="small:hidden text-[10px]" />
    )}
    {selectedProviderId === providerId && children}
  </RadioGroupOption>
)

export default PaymentProviderOption

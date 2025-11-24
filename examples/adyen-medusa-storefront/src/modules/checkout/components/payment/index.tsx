"use client"

import { paymentInfoMap } from "@lib/constants"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, clx, Heading, Text } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentProviderOptions from "@modules/checkout/components/payment-providers"
import { PaymentProviders } from "@modules/checkout/components/payment-wrapper"
import { useCheckoutSteps, usePaymentSession } from "@modules/checkout/hooks"
import Divider from "@modules/common/components/divider"
import { useContext, useState } from "react"

interface Props {
  cart: HttpTypes.StoreCart & { gift_cards?: any }
  providers: HttpTypes.StorePaymentProvider[]
}

const Payment = ({ cart, providers }: Props) => {
  const session = usePaymentSession(cart)
  const [isLoading, setIsLoading] = useState(false)
  const { isPayment: isOpen, goToPayment, goToReview } = useCheckoutSteps()
  const paymentProviders = useContext(PaymentProviders)

  const providerId = paymentProviders?.id || ""
  const { ready, error, onUpdate } = paymentProviders?.provider || {}

  const paidByGiftcard =
    cart.gift_cards && cart.gift_cards?.length > 0 && cart.total === 0

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (session || paidByGiftcard)

  const handleSubmit = async () => {
    if (!paymentProviders || !ready) return
    setIsLoading(true)
    await onUpdate?.(providerId)
    setIsLoading(false)
    return goToReview()
  }

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && !previousStepsCompleted,
            }
          )}
        >
          Payment
          {!isOpen && previousStepsCompleted && <CheckCircleSolid />}
        </Heading>
        {!isOpen && previousStepsCompleted && (
          <Text>
            <button
              onClick={goToPayment}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-payment-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && <PaymentProviderOptions providers={providers} />}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                Gift card
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!ready || (!providerId && !paidByGiftcard)}
            data-testid="submit-payment-button"
          >
            {!ready || (!providerId && !paidByGiftcard)
              ? "Enter payment details"
              : "Continue to review"}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {previousStepsCompleted ? (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                {paidByGiftcard
                  ? "Gift card"
                  : paymentInfoMap[providerId || ""]?.title || providerId}
              </Text>
            </div>
          ) : null}
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment

"use client"

import { paymentInfoMap } from "@lib/constants"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, clx, Heading, Text } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentProviders from "@modules/checkout/components/payment-providers"
import { AdyenPayment } from "@modules/checkout/components/payment-wrapper/adyen-wrapper"
import { ProviderSelector } from "@modules/checkout/components/payment-wrapper/provider-wrapper"
import { StripePayment } from "@modules/checkout/components/payment-wrapper/stripe-wrapper"
import { useCheckoutSteps, usePaymentSession } from "@modules/checkout/hooks"
import Divider from "@modules/common/components/divider"
import { useContext, useState } from "react"

interface Props {
  cart: HttpTypes.StoreCart & { gift_cards?: any }
}

const Payment = ({ cart }: Props) => {
  const session = usePaymentSession(cart)
  const [isLoading, setIsLoading] = useState(false)
  const { isPayment: isOpen, goToPayment, goToReview } = useCheckoutSteps()
  const providerSelector = useContext(ProviderSelector)
  const adyenPayment = useContext(AdyenPayment)
  const stripePayment = useContext(StripePayment)

  let selectedProvider = ""
  let ready = false
  let error = null
  let updatePayment = () => Promise.resolve()
  if (providerSelector) ({ selectedProvider } = providerSelector)
  if (adyenPayment) ({ ready, error, updatePayment } = adyenPayment)
  if (stripePayment) ({ ready, error, updatePayment } = stripePayment)

  const paidByGiftcard =
    cart.gift_cards && cart.gift_cards?.length > 0 && cart.total === 0

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (session || paidByGiftcard)

  const handleSubmit = async () => {
    setIsLoading(true)
    if (ready) {
      await updatePayment()
      return goToReview()
    }
    setIsLoading(false)
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
          {!paidByGiftcard && <PaymentProviders />}

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
            disabled={!ready || (!selectedProvider && !paidByGiftcard)}
            data-testid="submit-payment-button"
          >
            {!ready || (!selectedProvider && !paidByGiftcard)
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
                  : paymentInfoMap[selectedProvider]?.title || selectedProvider}
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

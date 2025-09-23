"use client"

import { isStripe, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentProviders from "@modules/checkout/components/payment-providers"
import { useActiveSession, useCheckoutSteps } from "@modules/checkout/hooks"
import Divider from "@modules/common/components/divider"
import { StripeCardElementChangeEvent } from "@stripe/stripe-js"
import { useEffect, useState } from "react"

interface Props {
  cart: any
  paymentProviders: HttpTypes.StorePaymentProvider[]
}

const Payment = ({ cart, paymentProviders }: Props) => {
  const activeSession = useActiveSession(cart)
  const providerId = activeSession?.provider_id ?? ""

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [selectedPaymentProvider, setSelectedPaymentProvider] =
    useState(providerId)

  const handleProviderUpdate = (event: StripeCardElementChangeEvent) => {
    if (event.brand)
      setCardBrand(event.brand.charAt(0).toUpperCase() + event.brand.slice(1))
    if (event.error) setError(event.error.message || null)
    if (event.complete) setCardComplete(event.complete)
  }

  const { isPayment: isOpen, goToPayment, goToReview } = useCheckoutSteps()

  const selectPaymentProvider = (method: string) => {
    setError(null)
    setSelectedPaymentProvider(method)
  }

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const paymentReady =
    (activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const shouldInputCard =
        isStripe(selectedPaymentProvider) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentProvider

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentProvider,
        })
      }

      if (!shouldInputCard) {
        return goToReview()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && !paymentReady,
            }
          )}
        >
          Payment
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
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
          {!paidByGiftcard && paymentProviders?.length && (
            <PaymentProviders
              cart={cart}
              providers={paymentProviders}
              onUpdate={handleProviderUpdate}
              onSelect={selectPaymentProvider}
            />
          )}

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
            disabled={
              (isStripe(selectedPaymentProvider) && !cardComplete) ||
              (!selectedPaymentProvider && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            {!activeSession && isStripe(selectedPaymentProvider)
              ? " Enter card details"
              : "Continue to review"}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex items-start gap-x-1 w-full">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Payment method
                </Text>
                <Text
                  className="txt-medium text-ui-fg-subtle"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[activeSession?.provider_id]?.title ||
                    activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Payment details
                </Text>
                <div
                  className="flex gap-2 txt-medium text-ui-fg-subtle items-center"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                    {paymentInfoMap[selectedPaymentProvider]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>
                    {isStripe(selectedPaymentProvider) && cardBrand
                      ? cardBrand
                      : "Another step will appear"}
                  </Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
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
          ) : null}
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment

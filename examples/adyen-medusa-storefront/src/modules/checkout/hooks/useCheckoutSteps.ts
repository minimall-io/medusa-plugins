import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

const useCheckoutSteps = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const goToAddress = () => {
    router.push(pathname + "?" + createQueryString("step", "address"))
  }

  const goToDelivery = () => {
    router.push(pathname + "?" + createQueryString("step", "delivery"), {
      scroll: false,
    })
  }

  const goToPayment = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const goToReview = () => {
    router.push(pathname + "?" + createQueryString("step", "review"), {
      scroll: false,
    })
  }

  const isAddress = searchParams.get("step") === "address"
  const isDelivery = searchParams.get("step") === "delivery"
  const isPayment = searchParams.get("step") === "payment"
  const isReview = searchParams.get("step") === "review"

  return {
    isAddress,
    isDelivery,
    isPayment,
    isReview,
    goToAddress,
    goToDelivery,
    goToPayment,
    goToReview,
  }
}

export default useCheckoutSteps

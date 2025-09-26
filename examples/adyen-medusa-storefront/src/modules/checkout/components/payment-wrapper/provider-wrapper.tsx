import { HttpTypes } from "@medusajs/types"
import { IProviderSelector, useProviderSelector } from "@modules/checkout/hooks"
import { createContext } from "react"

interface Props {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const ProviderSelector = createContext<IProviderSelector | null>(null)

const ProviderWrapper = ({ cart, children }: Props) => {
  const providerSelector = useProviderSelector(cart)

  return (
    <ProviderSelector.Provider value={{ ...providerSelector }}>
      {children}
    </ProviderSelector.Provider>
  )
}

export default ProviderWrapper

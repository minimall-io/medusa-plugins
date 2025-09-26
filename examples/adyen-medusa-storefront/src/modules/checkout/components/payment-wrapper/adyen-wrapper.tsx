"use client"

import "@adyen/adyen-web/styles/adyen.css"
import { HttpTypes } from "@medusajs/types"
import { IAdyenPayment, useAdyenPayment } from "@modules/checkout/hooks"
import { createContext } from "react"

interface Props {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const AdyenPayment = createContext<IAdyenPayment | null>(null)

const AdyenWrapper = ({ cart, children }: Props) => {
  const adyenPayment = useAdyenPayment(cart)

  return (
    <AdyenPayment.Provider value={{ ...adyenPayment }}>
      {children}
    </AdyenPayment.Provider>
  )
}

export default AdyenWrapper

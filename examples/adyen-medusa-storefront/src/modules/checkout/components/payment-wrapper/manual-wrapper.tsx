"use client"

import { HttpTypes } from "@medusajs/types"
import { IManualPayment, useManualPayment } from "@modules/checkout/hooks"
import { createContext } from "react"

interface Props {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const ManualPayment = createContext<IManualPayment | null>(null)

const ManualWrapper = ({ cart, children }: Props) => {
  const manualPayment = useManualPayment(cart)

  return (
    <ManualPayment.Provider value={{ ...manualPayment }}>
      {children}
    </ManualPayment.Provider>
  )
}

export default ManualWrapper

"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders, getCacheOptions } from "./cookies"

export interface SavedPaymentMethod<Data> {
  id: string
  provider_id: string
  data: Data
}

export interface StorePaymentMethodListResponse<Data> {
  payment_methods: SavedPaymentMethod<Data>[]
}

export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("payment_providers")),
  }

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1
      })
    )
    .catch(() => {
      return null
    })
}

export const getSavedPaymentMethods = async <Data>(accountHolderId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<StorePaymentMethodListResponse<Data>>(
      `/store/payment-methods/${accountHolderId}`,
      {
        method: "GET",
        headers,
      }
    )
    .catch(() => {
      return {
        payment_methods: [],
      }
    })
}

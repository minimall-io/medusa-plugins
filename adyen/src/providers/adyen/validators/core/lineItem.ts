import { z } from 'zod'

export const LineItemSchema = z.object({
  amountExcludingTax: z.number().optional(),
  amountIncludingTax: z.number().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  id: z.string().optional(),
  imageUrl: z.string().optional(),
  itemCategory: z.string().optional(),
  manufacturer: z.string().optional(),
  marketplaceSellerId: z.string().optional(),
  productUrl: z.string().optional(),
  quantity: z.number().optional(),
  receiverEmail: z.string().optional(),
  size: z.string().optional(),
  sku: z.string().optional(),
  taxAmount: z.number().optional(),
  taxPercentage: z.number().optional(),
  upc: z.string().optional(),
})

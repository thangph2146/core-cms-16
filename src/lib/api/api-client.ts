/**
 * API Client Helper
 * Type-safe API client wrapper using centralized routes
 * Follows Next.js 16 + TanStack Query best practices
 */

import { apiClient } from "./axios"
import { apiRoutes } from "./routes"
import type { AxiosResponse } from "axios"
import type { GiftCodeValidation } from "@/features/public/checkout/types"

/**
 * Helper to extract data from response
 */
const getData = <T>(response: AxiosResponse<T>) => response.data

/**
 * Public API Client - Type-safe wrapper using apiRoutes
 */
export const publicApiClient = {
  // Cart operations
  getCart: () => apiClient.get(apiRoutes.publicCart.get).then(getData),
  
  clearCart: () => apiClient.delete(apiRoutes.publicCart.clear).then(getData),
  
  addCartItem: (data: { productId: string; quantity: number }) =>
    apiClient.post(apiRoutes.publicCart.addItem, data).then(getData),
  
  updateCartItem: (id: string, data: { quantity: number }) =>
    apiClient.put(apiRoutes.publicCart.updateItem(id), data).then(getData),
  
  removeCartItem: (id: string) =>
    apiClient.delete(apiRoutes.publicCart.removeItem(id)).then(getData),

  // Checkout operations
  createCheckout: <T = unknown>(data: unknown): Promise<AxiosResponse<T>> =>
    apiClient.post<T>(apiRoutes.publicCheckout.create, data),
  
  getUserInfo: () =>
    apiClient.get(apiRoutes.publicCheckout.userInfo).then((res) => res.data.data),

  // Gift Code operations
  validateGiftCode: (data: { code: string; subtotal: number }) =>
    apiClient
      .post<{ success: boolean; data?: GiftCodeValidation; message?: string }>(
        apiRoutes.publicGiftCode.validate,
        data
      )
      .then(getData),
} as const

/**
 * Re-export apiClient for direct usage when needed
 */
export { apiClient } from "./axios"


/**
 * Client-side authentication utilities với NextAuth
 * 
 * Wrapper cho NextAuth client-side functions để đảm bảo consistency
 * và dễ dàng thay đổi implementation trong tương lai
 */
"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { apiClient } from "@/lib/api/axios"
import { apiRoutes } from "@/lib/api/routes"

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  name: string
  email: string
  password: string
}

/**
 * Re-export useSession từ NextAuth để đảm bảo consistency
 * Sử dụng wrapper này thay vì import trực tiếp từ "next-auth/react"
 */
export { useSession }

/**
 * Re-export signIn và signOut để đảm bảo consistency
 */
export { signIn, signOut }

export const authApi = {
  signIn: async (data: SignInRequest) =>
    signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    }),

  signUp: async (data: SignUpRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(apiRoutes.auth.signUp, data)
    return response.data
  },

  signOut: async (): Promise<void> => {
    await signOut({ callbackUrl: "/auth/sign-in" })
  },

  // DEPRECATED: Use NextAuth useSession hook instead of API call
  // This method is kept for backward compatibility only
  // TODO: Remove this method and use useSession hook instead
  getCurrentUser: async () => {
    // Note: This endpoint may not exist. Use useSession hook instead.
    const response = await apiClient.get(apiRoutes.auth.session)
    return response.data
  },
} as const

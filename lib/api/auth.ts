/**
 * API functions cho authentication với NextAuth
 */
"use client"

import { signIn, signOut } from "next-auth/react"
import { apiClient } from "./axios"

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  name: string
  email: string
  password: string
}

export const authApi = {
  signIn: async (data: SignInRequest) => {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })
    return result
  },

  signUp: async (data: SignUpRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>("/auth/signup", data)
    return response.data
  },

  signOut: async (): Promise<void> => {
    await signOut({ callbackUrl: "/auth/sign-in" })
  },

  // Use NextAuth useSession hook instead of API call
  getCurrentUser: async () => {
    // This should be replaced with useSession hook
    // For backward compatibility, we'll use session endpoint
    const response = await apiClient.get("/auth/me")
    return response.data
  },
}

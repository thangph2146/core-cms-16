/**
 * NextAuth.js configuration and helpers
 */
import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

export const authConfig: NextAuthConfig = {
  trustHost: true, // Important for Next.js 16
  // Adapter chỉ dùng khi cần database session, không dùng với JWT
  // adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        })

        if (!user || !user.isActive) {
          return null
        }

        const isValidPassword = await bcrypt.compare(password, user.password)

        if (!isValidPassword) {
          return null
        }

        // Get user permissions
        const permissions = user.userRoles.flatMap(
          (ur: { role: { permissions: string[] } }) => ur.role.permissions
        )

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          permissions,
          roles: user.userRoles.map((ur: { role: { id: string; name: string; displayName: string } }) => ({
            id: ur.role.id,
            name: ur.role.name,
            displayName: ur.role.displayName,
          })),
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.permissions = (user as any).permissions || []
        token.roles = (user as any).roles || []
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session as any).permissions = token.permissions || []
        ;(session as any).roles = token.roles || []
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    signOut: "/auth/sign-in",
    error: "/auth/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

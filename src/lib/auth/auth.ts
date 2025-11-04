/**
 * NextAuth.js configuration and helpers
 */
import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"

import { randomBytes } from "crypto"
import { prisma } from "@/lib/database"
import { DEFAULT_ROLES } from "@/lib/permissions"

type DbUser = Awaited<ReturnType<typeof getUserWithRoles>>

async function getUserWithRoles(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  })
}

async function getOrCreateDefaultRole() {
  let defaultRole = await prisma.role.findUnique({
    where: { name: DEFAULT_ROLES.USER.name },
  })

  if (!defaultRole) {
    defaultRole = await prisma.role.create({
      data: {
        name: DEFAULT_ROLES.USER.name,
        displayName: DEFAULT_ROLES.USER.displayName,
        permissions: [...DEFAULT_ROLES.USER.permissions],
        isActive: true,
      },
    })
  }

  return defaultRole
}

async function createUserFromOAuth({
  email,
  name,
  image,
}: {
  email: string
  name?: string | null
  image?: string | null
}): Promise<DbUser> {
  // Tìm hoặc tạo default role nếu chưa tồn tại
  const defaultRole = await getOrCreateDefaultRole()

  const password = await bcrypt.hash(randomBytes(16).toString("hex"), 10)

  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      avatar: image ?? null,
      password,
      isActive: true,
    },
  })

  // Gán role cho user (luôn có role vì đã tạo ở trên)
  await prisma.userRole.create({
    data: {
      userId: newUser.id,
      roleId: defaultRole.id,
    },
  })

  return getUserWithRoles(email)
}

function mapUserAuthPayload(user: DbUser | null) {
  if (!user) {
    return null
  }

  // Đảm bảo user luôn có ít nhất một role
  if (!user.userRoles || user.userRoles.length === 0) {
    return null
  }

  const permissions = user.userRoles.flatMap((ur) => ur.role.permissions)
  const roles = user.userRoles.map((ur) => ({
    id: ur.role.id,
    name: ur.role.name,
    displayName: ur.role.displayName,
  }))

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.avatar,
    permissions,
    roles,
  }
}

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
        return mapUserAuthPayload(user)
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) {
        return false
      }

      try {
        const normalizedEmail = user.email.toLowerCase()
        let dbUser = await getUserWithRoles(normalizedEmail)

        if (!dbUser && normalizedEmail !== user.email) {
          dbUser = await getUserWithRoles(user.email)
        }

        if (!dbUser && account?.provider === "google") {
          dbUser = await createUserFromOAuth({
            email: normalizedEmail,
            name: user.name,
            image: user.image,
          })
        }

        const lookupEmail = dbUser?.email ?? normalizedEmail

        if (
          dbUser &&
          account?.provider === "google" &&
          (dbUser.deletedAt !== null || !dbUser.isActive)
        ) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              deletedAt: null,
              isActive: true,
            },
          })
          dbUser = await getUserWithRoles(lookupEmail)
        }

        if (
          dbUser &&
          account?.provider === "google" &&
          (!dbUser.userRoles || dbUser.userRoles.length === 0)
        ) {
          const defaultRole = await getOrCreateDefaultRole()
          await prisma.userRole.create({
            data: {
              userId: dbUser.id,
              roleId: defaultRole.id,
            },
          })
          dbUser = await getUserWithRoles(lookupEmail)
        }

        if (!dbUser || !dbUser.isActive) {
          return false
        }

        // Đảm bảo user có ít nhất một role
        if (!dbUser.userRoles || dbUser.userRoles.length === 0) {
          return false
        }

        const authPayload = mapUserAuthPayload(dbUser)

        if (!authPayload) {
          return false
        }

        Object.assign(user, authPayload)

        return true
      } catch (error) {
        console.error("[auth] Error in signIn callback:", error)
        return false
      }
    },
    async jwt({ token, user, trigger }) {
      // Khi user đăng nhập lần đầu
      if (user) {
        const userWithPerms = user as typeof user & {
          permissions?: string[]
          roles?: Array<{ id: string; name: string; displayName: string }>
        }
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.permissions = Array.isArray(userWithPerms.permissions)
          ? userWithPerms.permissions
          : []
        token.roles = Array.isArray(userWithPerms.roles)
          ? userWithPerms.roles
          : []
        token.picture = user.image
        // Thêm timestamp để track khi token được tạo
        token.iat = Math.floor(Date.now() / 1000)
      } 
      // Refresh token khi cần (khi session được update)
      else if (trigger === "update" && token.email) {
        // Refresh user data từ database khi session được update
        const dbUser = await getUserWithRoles(token.email as string)
        const authPayload = mapUserAuthPayload(dbUser)
        
        if (authPayload) {
          token.id = authPayload.id
          token.permissions = authPayload.permissions ?? []
          token.roles = authPayload.roles ?? []
          token.picture = authPayload.image
          token.name = authPayload.name
        }
      }
      // Kiểm tra và refresh permissions nếu token thiếu data
      else if (
        (!token.permissions || (Array.isArray(token.permissions) && token.permissions.length === 0)) &&
        token.email
      ) {
        const dbUser = await getUserWithRoles(token.email as string)
        const authPayload = mapUserAuthPayload(dbUser)

        if (authPayload) {
          token.id = authPayload.id
          token.permissions = authPayload.permissions ?? []
          token.roles = authPayload.roles ?? []
          token.picture = authPayload.image
          token.name = authPayload.name
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.image = (token.picture as string | null) ?? session.user.image
        const sessionWithPerms = session as typeof session & {
          permissions?: string[]
          roles?: Array<{ id: string; name: string; displayName: string }>
        }
        sessionWithPerms.permissions = Array.isArray(token.permissions) ? token.permissions : []
        sessionWithPerms.roles = Array.isArray(token.roles) ? token.roles : []
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
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  // JWT Configuration
  // Trong NextAuth v5, JWT options được đặt ở top-level
  // JWT secret được set qua 'secret' option ở bottom
  // JWT signing algorithm mặc định là HS256 (an toàn)
  // Có thể custom JWT thông qua jwt callback
  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

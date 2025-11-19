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
import { NotificationKind } from "@prisma/client"
import { logger } from "@/lib/config"
import {
  createNotificationForSuperAdmins,
  createNotificationForUser,
  emitNotificationToSuperAdminsAfterCreate,
} from "@/features/admin/notifications/server/mutations"

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

async function _getOrCreateDefaultRole() {
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

async function getOrCreateParentRole() {
  let parentRole = await prisma.role.findUnique({
    where: { name: DEFAULT_ROLES.PARENT.name },
  })

  if (!parentRole) {
    parentRole = await prisma.role.create({
      data: {
        name: DEFAULT_ROLES.PARENT.name,
        displayName: DEFAULT_ROLES.PARENT.displayName,
        permissions: [...DEFAULT_ROLES.PARENT.permissions],
        isActive: true,
      },
    })
  }

  return parentRole
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
  // Tìm hoặc tạo parent role cho user đăng ký/đăng nhập bằng Google
  const parentRole = await getOrCreateParentRole()

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

  // Gán role parent cho user đăng ký/đăng nhập bằng Google
  await prisma.userRole.create({
    data: {
      userId: newUser.id,
      roleId: parentRole.id,
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

// Validate required environment variables
// Chỉ validate khi NextAuth được khởi tạo (lazy validation)
function validateAuthConfig() {
  // Chỉ check trong runtime (server-side)
  if (typeof window === "undefined") {
    if (!process.env.NEXTAUTH_SECRET) {
      logger.warn("⚠️  NEXTAUTH_SECRET is missing! Authentication may not work properly.")
      logger.warn("📝 Please set NEXTAUTH_SECRET in your .env.local file")
      logger.warn("🔑 Generate a secret with: openssl rand -base64 32")
    }
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
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn("Missing credentials in authorize", {
              hasEmail: !!credentials?.email,
              hasPassword: !!credentials?.password,
            })
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

          // Kiểm tra user tồn tại, đang active và không bị xóa
          if (!user || !user.isActive || user.deletedAt !== null) {
            logger.warn("User not found or inactive", {
              email,
              found: !!user,
              isActive: user?.isActive,
              deletedAt: user?.deletedAt,
            })
            return null
          }

          const isValidPassword = await bcrypt.compare(password, user.password)

          if (!isValidPassword) {
            logger.warn("Invalid password", { email })
            return null
          }

          // Get user permissions
          const authPayload = mapUserAuthPayload(user)
          
          if (!authPayload) {
            logger.error("Failed to map user auth payload", { email, userId: user.id })
            return null
          }

          return authPayload
        } catch (error) {
          logger.error("Error in authorize callback", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
          // Return null thay vì throw để NextAuth có thể xử lý lỗi đúng cách
          return null
        }
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
        
        // Tìm user bao gồm cả user đã bị xóa để kiểm tra
        // Sử dụng findFirst với where rõ ràng để đảm bảo tìm được cả user bị xóa
        let dbUser = await prisma.user.findFirst({
          where: { 
            email: normalizedEmail,
            // Không filter theo deletedAt hoặc isActive - tìm tất cả
          },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        })

        // Nếu không tìm thấy với normalizedEmail, thử với email gốc
        if (!dbUser && normalizedEmail !== user.email) {
          dbUser = await prisma.user.findFirst({
            where: { 
              email: user.email,
              // Không filter theo deletedAt hoặc isActive - tìm tất cả
            },
            include: {
              userRoles: {
                include: {
                  role: true,
                },
              },
            },
          })
        }

        // Log để debug
        logger.debug("User lookup result", {
          email: normalizedEmail,
          found: !!dbUser,
          isActive: dbUser?.isActive,
          deletedAt: dbUser?.deletedAt,
          provider: account?.provider,
          userId: dbUser?.id,
        })

        // Nếu user đã tồn tại, kiểm tra trạng thái TRƯỚC khi xử lý tiếp
        if (dbUser) {
          // Nếu user bị vô hiệu hóa hoặc đã xóa, KHÔNG cho phép đăng nhập
          // và KHÔNG tạo user mới (để tránh duplicate)
          if (!dbUser.isActive || dbUser.deletedAt !== null) {
            logger.warn("Login attempt BLOCKED - user is inactive or deleted", {
              email: normalizedEmail,
              isActive: dbUser.isActive,
              deletedAt: dbUser.deletedAt,
              provider: account?.provider,
              userId: dbUser.id,
            })
            return false
          }
          // User tồn tại và active - tiếp tục xử lý
        } else {
          // User chưa tồn tại - chỉ tạo user mới nếu đăng nhập bằng Google
          if (account?.provider === "google") {
            logger.info("Creating new user from Google OAuth", {
              email: normalizedEmail,
              name: user.name,
            })
            dbUser = await createUserFromOAuth({
              email: normalizedEmail,
              name: user.name,
              image: user.image,
            })
          } else {
            // Không phải Google và user không tồn tại - không cho phép đăng nhập
            logger.warn("Login attempt BLOCKED - user not found", {
              email: normalizedEmail,
              provider: account?.provider,
            })
            return false
          }
        }

        const lookupEmail = dbUser?.email ?? normalizedEmail

        // Đảm bảo user có role (chỉ cho user mới tạo hoặc user đã tồn tại nhưng chưa có role)
        // Nếu đăng nhập bằng Google và chưa có role, gán role parent
        if (
          dbUser &&
          account?.provider === "google" &&
          (!dbUser.userRoles || dbUser.userRoles.length === 0)
        ) {
          const parentRole = await getOrCreateParentRole()
          await prisma.userRole.create({
            data: {
              userId: dbUser.id,
              roleId: parentRole.id,
            },
          })
          // Refresh user từ database sau khi thêm role
          dbUser = await prisma.user.findFirst({
            where: { email: lookupEmail },
            include: {
              userRoles: {
                include: {
                  role: true,
                },
              },
            },
          })
        }

        // Kiểm tra lại user tồn tại, đang active và không bị xóa (double check)
        // QUAN TRỌNG: Kiểm tra lại sau khi refresh từ database
        if (!dbUser) {
          logger.warn("Login attempt BLOCKED - user not found after refresh", {
            email: normalizedEmail,
            provider: account?.provider,
          })
          return false
        }

        // Kiểm tra isActive và deletedAt một lần nữa
        if (!dbUser.isActive) {
          logger.warn("Login attempt BLOCKED - user is inactive", {
            email: normalizedEmail,
            userId: dbUser.id,
            isActive: dbUser.isActive,
            provider: account?.provider,
          })
          return false
        }

        if (dbUser.deletedAt !== null) {
          logger.warn("Login attempt BLOCKED - user is deleted", {
            email: normalizedEmail,
            userId: dbUser.id,
            deletedAt: dbUser.deletedAt,
            provider: account?.provider,
          })
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

        // Tạo 2 thông báo khác nhau cùng lúc khi user đăng nhập thành công:
        // 1. Thông báo chào mừng cho người dùng (SUCCESS)
        // 2. Thông báo quản lý cho super admin (SYSTEM) để kiểm tra hành vi hệ thống
        try {
          const userName = dbUser.name || dbUser.email || "Người dùng"
          const provider = account?.provider || "credentials"
          const providerName = provider === "google" ? "Google OAuth" : "Credentials"
          const loginTime = new Date().toISOString()
          
          logger.debug("Creating login notifications", {
            userId: dbUser.id,
            email: dbUser.email,
            name: userName,
            provider,
          })
          
          // Tạo cả 2 thông báo cùng lúc (song song) để đảm bảo không có delay
          const [userNotificationResult, adminNotificationResult] = await Promise.allSettled([
            // 1. Thông báo chào mừng cho người dùng đăng nhập
            createNotificationForUser(
              dbUser.id,
              "🎉 Chào mừng bạn đăng nhập!",
              `Chào mừng ${userName}! Bạn đã đăng nhập thành công vào hệ thống qua ${providerName}.`,
              "/admin/dashboard",
              NotificationKind.SUCCESS,
              {
                type: "welcome",
                provider,
                loginTime,
              }
            ),
            // 2. Thông báo quản lý cho super admin để kiểm tra hành vi hệ thống
            createNotificationForSuperAdmins(
              "🔔 Hoạt động đăng nhập hệ thống",
              `Người dùng ${userName} (${dbUser.email}) vừa đăng nhập vào hệ thống qua ${providerName}. Thời gian: ${new Date().toLocaleString("vi-VN")}.`,
              `/admin/users/${dbUser.id}`,
              NotificationKind.SYSTEM,
              {
                type: "login_activity",
                userId: dbUser.id,
                userEmail: dbUser.email,
                userName: dbUser.name,
                provider,
                loginTime,
                purpose: "system_monitoring", // Mục đích: quản lý và kiểm tra hành vi hệ thống
              }
            ),
          ])

          // Emit socket event cho super admin notification sau khi tạo trong DB
          if (adminNotificationResult.status === "fulfilled" && adminNotificationResult.value?.count > 0) {
            try {
              await emitNotificationToSuperAdminsAfterCreate(
                "🔔 Hoạt động đăng nhập hệ thống",
                `Người dùng ${userName} (${dbUser.email}) vừa đăng nhập vào hệ thống qua ${providerName}. Thời gian: ${new Date().toLocaleString("vi-VN")}.`,
                `/admin/users/${dbUser.id}`,
                NotificationKind.SYSTEM,
                {
                  type: "login_activity",
                  userId: dbUser.id,
                  userEmail: dbUser.email,
                  userName: dbUser.name,
                  provider,
                  loginTime,
                  purpose: "system_monitoring",
                }
              )
              logger.success("Socket notification emitted for login activity", {
                userId: dbUser.id,
                email: dbUser.email,
              })
            } catch (emitError) {
              logger.error("Error emitting socket notification for login", emitError instanceof Error ? emitError : new Error(String(emitError)))
            }
          }
          
          // Log kết quả chi tiết
          if (userNotificationResult.status === "fulfilled" && userNotificationResult.value) {
            logger.success("User welcome notification created successfully", {
              notificationId: userNotificationResult.value.id,
              userId: dbUser.id,
              email: dbUser.email,
              title: "🎉 Chào mừng bạn đăng nhập!",
            })
          } else {
            logger.error("Error creating user welcome notification", userNotificationResult.status === "rejected" ? userNotificationResult.reason : new Error("Unknown error"))
          }
          
          if (adminNotificationResult.status === "fulfilled" && adminNotificationResult.value) {
            logger.success("Super admin monitoring notification created successfully", {
              count: adminNotificationResult.value.count || 0,
              userId: dbUser.id,
              email: dbUser.email,
              title: "🔔 Hoạt động đăng nhập hệ thống",
            })
          } else {
            logger.error("Error creating super admin monitoring notification", adminNotificationResult.status === "rejected" ? adminNotificationResult.reason : new Error("Unknown error"))
          }
          
          // Summary log
          const userNotificationSuccess = userNotificationResult.status === "fulfilled" && userNotificationResult.value !== null
          const adminNotificationSuccess = adminNotificationResult.status === "fulfilled" && adminNotificationResult.value !== null
          
          if (userNotificationSuccess && adminNotificationSuccess) {
            logger.success("Both notifications created successfully", {
              userId: dbUser.id,
              email: dbUser.email,
              userNotificationId: userNotificationResult.value?.id,
              adminNotificationCount: adminNotificationResult.value?.count || 0,
            })
          } else {
            logger.warn("Some notifications failed to create", {
              userId: dbUser.id,
              email: dbUser.email,
              userNotificationSuccess,
              adminNotificationSuccess,
            })
          }
        } catch (notificationError) {
          // Log error nhưng không block sign-in process
          logger.error("Error creating login notifications", notificationError instanceof Error ? notificationError : new Error(String(notificationError)))
        }

        return true
      } catch (error) {
        logger.error("Error in signIn callback", error instanceof Error ? error : new Error(String(error)))
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
        
        // Kiểm tra user vẫn active và không bị xóa - nếu không thì invalidate token
        if (!dbUser || !dbUser.isActive || dbUser.deletedAt !== null) {
          // User đã bị vô hiệu hóa hoặc xóa - return null để force logout
          // NextAuth sẽ xử lý null token bằng cách invalidate session
          // Type assertion cần thiết vì NextAuth JWT callback có thể return null
          return null as unknown as typeof token
        }
        
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
        
        // Kiểm tra user vẫn active và không bị xóa - nếu không thì invalidate token
        if (!dbUser || !dbUser.isActive || dbUser.deletedAt !== null) {
          // User đã bị vô hiệu hóa hoặc xóa - return null để force logout
          // NextAuth sẽ xử lý null token bằng cách invalidate session
          // Type assertion cần thiết vì NextAuth JWT callback có thể return null
          return null as unknown as typeof token
        }
        
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

// Validate config trước khi khởi tạo NextAuth (chỉ trong runtime)
// Điều này đảm bảo validation chỉ chạy khi thực sự cần, không trong build time
if (typeof window === "undefined") {
  validateAuthConfig()
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

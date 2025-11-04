/**
 * Sign Up API Route - Tạo user mới
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import bcrypt from "bcryptjs"
import { createPostRoute } from "@/lib/api/api-route-wrapper"
import {
  validateEmail,
  validatePassword,
  validateStringLength,
  sanitizeString,
  sanitizeEmail,
} from "@/lib/api/validation"

async function signupHandler(
  request: NextRequest,
  _context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>> | null
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  }
) {
  const body = await request.json()
  const { name, email, password } = body

  // Validate và sanitize input
  const nameValidation = validateStringLength(
    name,
    1,
    100,
    "Tên"
  )
  if (!nameValidation.valid) {
    return NextResponse.json({ error: nameValidation.error }, { status: 400 })
  }

  const emailValidation = validateEmail(email)
  if (!emailValidation.valid) {
    return NextResponse.json({ error: emailValidation.error }, { status: 400 })
  }

  const passwordValidation = validatePassword(password)
  if (!passwordValidation.valid) {
    return NextResponse.json(
      { error: passwordValidation.error },
      { status: 400 }
    )
  }

  // Sanitize inputs
  const sanitizedName = sanitizeString(name)
  const sanitizedEmail = sanitizeEmail(email)

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: sanitizedEmail },
  })

  if (existingUser) {
    return NextResponse.json(
      { error: "Email đã được sử dụng" },
      { status: 400 }
    )
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create user
  const user = await prisma.user.create({
    data: {
      email: sanitizedEmail,
      name: sanitizedName,
      password: hashedPassword,
    },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

  // Get default user role if exists
  const defaultRole = await prisma.role.findUnique({
    where: { name: "user" },
  })

  if (defaultRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: defaultRole.id,
      },
    })
  }

  return NextResponse.json({
    message: "Đăng ký thành công",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })
}

export const POST = createPostRoute(signupHandler, {
  requireAuth: false,
  rateLimit: "auth",
})


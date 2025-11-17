/**
 * Public API Route: POST /api/contact
 * 
 * Submit contact form - no authentication required
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import { CreateContactRequestSchema } from "@/features/admin/contact-requests/server/schemas"
import { createErrorResponse, createSuccessResponse } from "@/lib/config"
import { notifySuperAdminsOfContactRequestAction } from "@/features/admin/contact-requests/server/notifications"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input với zod
    const validationResult = CreateContactRequestSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return createErrorResponse(
        firstError?.message || "Dữ liệu không hợp lệ",
        { status: 400 }
      )
    }

    const validatedInput = validationResult.data

    // Create contact request
    const contactRequest = await prisma.contactRequest.create({
      data: {
        name: validatedInput.name.trim(),
        email: validatedInput.email.trim(),
        phone: validatedInput.phone?.trim() || null,
        subject: validatedInput.subject.trim(),
        content: validatedInput.content.trim(),
        status: validatedInput.status || "NEW",
        priority: validatedInput.priority || "MEDIUM",
        userId: null, // Public form không có user
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Emit notification realtime
    await notifySuperAdminsOfContactRequestAction(
      "create",
      "unknown", // Public form
      {
        id: contactRequest.id,
        subject: contactRequest.subject,
        name: contactRequest.name,
        email: contactRequest.email,
      }
    )

    return createSuccessResponse(
      {
        id: contactRequest.id,
        message: "Gửi tin nhắn thành công",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/contact] Error:", error)

    const errorMessage = error instanceof Error
      ? error.message
      : "Không thể gửi tin nhắn. Vui lòng thử lại sau."

    return createErrorResponse(errorMessage, { status: 500 })
  }
}


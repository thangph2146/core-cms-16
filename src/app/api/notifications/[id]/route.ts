/**
 * API Route: PATCH /api/notifications/[id] - Update notification (mark as read/unread)
 * DELETE /api/notifications/[id] - Delete notification
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/database"

async function patchNotificationHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { isRead } = body

  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id },
  })

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  }

  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Update notification
  const updateData: { isRead: boolean; readAt?: Date | null } = {
    isRead: isRead === true || isRead === "true",
  }

  if (updateData.isRead && !notification.readAt) {
    updateData.readAt = new Date()
  } else if (!updateData.isRead) {
    updateData.readAt = null
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({
    id: updated.id,
    userId: updated.userId,
    kind: updated.kind,
    title: updated.title,
    description: updated.description,
    isRead: updated.isRead,
    actionUrl: updated.actionUrl,
    metadata: updated.metadata as Record<string, unknown> | null,
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    readAt: updated.readAt,
  })
}

async function deleteNotificationHandler(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id },
  })

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 })
  }

  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Delete notification
  await prisma.notification.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    return await patchNotificationHandler(req, context)
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    return await deleteNotificationHandler(req, context)
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


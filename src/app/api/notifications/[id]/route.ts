/**
 * API Route cho Notification operations (mark as read, delete)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import { PERMISSIONS } from "@/lib/permissions"
import {
  getNotificationCache,
  getSocketServer,
  mapNotificationToPayload,
  removeNotificationFromCache,
  updateNotificationInCache,
} from "@/lib/socket/state"
import {
  createPatchRoute,
  createDeleteRoute,
} from "@/lib/api/api-route-wrapper"
import { validateID } from "@/lib/api/validation"

// PATCH - Mark notification as read/unread
async function patchNotificationHandler(
  request: NextRequest,
  context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  },
  ...args: unknown[]
) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  // Validate ID (UUID or CUID)
  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  const body = await request.json()
  const { isRead } = body

  // Verify notification belongs to user
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: context.session.user.id,
    },
  })

  if (!notification) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 }
    )
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: isRead ?? !notification.isRead,
      readAt: isRead !== false ? new Date() : null,
    },
  })

  updateNotificationInCache(context.session.user.id, updated.id, (item) => {
    item.read = updated.isRead
  })

  const io = getSocketServer()
  if (io) {
    const payload = mapNotificationToPayload(updated)
    io.to(`user:${context.session.user.id}`).emit("notification:updated", payload)
  }

  return NextResponse.json(updated)
}

// DELETE - Xóa notification
async function deleteNotificationHandler(
  request: NextRequest,
  context: {
    session: Awaited<ReturnType<typeof import("@/lib/auth").requireAuth>>
    permissions: import("@/lib/permissions").Permission[]
    roles: Array<{ name: string }>
  },
  ...args: unknown[]
) {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params

  // Validate ID (UUID or CUID)
  const idValidation = validateID(id)
  if (!idValidation.valid) {
    return NextResponse.json({ error: idValidation.error }, { status: 400 })
  }

  // Verify notification belongs to user
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: context.session.user.id,
    },
  })

  if (!notification) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 }
    )
  }

  await prisma.notification.delete({
    where: { id },
  })

  const removed = removeNotificationFromCache(context.session.user.id, id)

  const io = getSocketServer()
  if (io && removed) {
    const cache = getNotificationCache()
    const current = cache.get(context.session.user.id) ?? []
    io.to(`user:${context.session.user.id}`).emit("notifications:sync", current)
  }

  return NextResponse.json({ success: true })
}

export const PATCH = createPatchRoute(patchNotificationHandler, {
  permissions: PERMISSIONS.NOTIFICATIONS_VIEW,
})

export const DELETE = createDeleteRoute(deleteNotificationHandler, {
  permissions: PERMISSIONS.NOTIFICATIONS_VIEW,
})

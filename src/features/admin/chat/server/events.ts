import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { logger } from "@/lib/config"

export async function emitGroupDeleted(groupId: string): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  try {
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId,
        leftAt: null,
      },
      select: { userId: true },
    })

    const memberIds = groupMembers.map((m) => m.userId)
    memberIds.forEach((userId) => {
      io.to(`user:${userId}`).emit("group:deleted", { id: groupId })
    })
    logger.debug("Socket group:deleted emitted", { groupId, memberCount: memberIds.length })
  } catch (error) {
    logger.error("Failed to emit socket group delete", error instanceof Error ? error : new Error(String(error)))
  }
}

export async function emitGroupHardDeleted(groupId: string, memberIds: string[]): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  try {
    memberIds.forEach((userId) => {
      io.to(`user:${userId}`).emit("group:hard-deleted", { id: groupId })
    })
    logger.debug("Socket group:hard-deleted emitted", { groupId, memberCount: memberIds.length })
  } catch (error) {
    logger.error("Failed to emit socket group hard delete", error instanceof Error ? error : new Error(String(error)))
  }
}

export async function emitGroupRestored(groupId: string): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  try {
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId,
        leftAt: null,
      },
      select: { userId: true },
    })

    const memberIds = groupMembers.map((m) => m.userId)
    memberIds.forEach((userId) => {
      io.to(`user:${userId}`).emit("group:restored", { id: groupId })
    })
    logger.debug("Socket group:restored emitted", { groupId, memberCount: memberIds.length })
  } catch (error) {
    logger.error("Failed to emit socket group restore", error instanceof Error ? error : new Error(String(error)))
  }
}


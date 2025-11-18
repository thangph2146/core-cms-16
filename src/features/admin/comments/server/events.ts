import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapCommentRecord, serializeCommentForTable } from "./helpers"
import type { CommentRow } from "../types"

const SUPER_ADMIN_ROOM = "role:super_admin"

export type CommentStatus = "active" | "deleted"

function resolveStatusFromRow(row: CommentRow): CommentStatus {
  return row.deletedAt ? "deleted" : "active"
}

async function fetchCommentRow(commentId: string): Promise<CommentRow | null> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!comment) {
    return null
  }

  const listed = mapCommentRecord(comment)
  return serializeCommentForTable(listed)
}

export async function emitCommentUpsert(
  commentId: string,
  previousStatus: CommentStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const row = await fetchCommentRow(commentId)
  if (!row) {
    if (previousStatus) {
      emitCommentRemove(commentId, previousStatus)
    }
    return
  }

  const newStatus = resolveStatusFromRow(row)

  io.to(SUPER_ADMIN_ROOM).emit("comment:upsert", {
    comment: row,
    previousStatus,
    newStatus,
  })
}

export function emitCommentRemove(commentId: string, previousStatus: CommentStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("comment:remove", {
    id: commentId,
    previousStatus,
  })
}

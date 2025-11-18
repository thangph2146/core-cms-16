/**
 * Socket events emission cho posts
 * Tách logic emit socket events ra khỏi mutations để code sạch hơn
 */

import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapPostRecord, serializePostForTable } from "./helpers"
import type { PostRow } from "../types"
import { logger } from "@/lib/config"

const SUPER_ADMIN_ROOM = "role:super_admin"

export type PostStatus = "active" | "deleted"

function resolveStatusFromRow(row: PostRow): PostStatus {
  return row.deletedAt ? "deleted" : "active"
}

async function fetchPostRow(postId: string): Promise<PostRow | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!post) {
    return null
  }

  const listed = mapPostRecord(post)
  return serializePostForTable(listed)
}

/**
 * Emit post:upsert event
 * Được gọi khi post được tạo, cập nhật, restore
 */
export async function emitPostUpsert(
  postId: string,
  previousStatus: PostStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const row = await fetchPostRow(postId)
  if (!row) {
    if (previousStatus) {
      emitPostRemove(postId, previousStatus)
    }
    return
  }

  const newStatus = resolveStatusFromRow(row)

  io.to(SUPER_ADMIN_ROOM).emit("post:upsert", {
    post: row,
    previousStatus,
    newStatus,
  })
  logger.debug("Socket post:upsert emitted", { postId, previousStatus, newStatus })
}

/**
 * Emit post:remove event
 * Được gọi khi post bị hard delete
 */
export function emitPostRemove(postId: string, previousStatus: PostStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("post:remove", {
    id: postId,
    previousStatus,
  })
  logger.debug("Socket post:remove emitted", { postId, previousStatus })
}


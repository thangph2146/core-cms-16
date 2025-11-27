import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapPostRecord, serializePostForTable } from "./helpers"
import type { PostRow } from "../types"
import { resourceLogger } from "@/lib/config"

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
}

export async function emitBatchPostUpsert(
  postIds: string[],
  previousStatus: PostStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io || postIds.length === 0) return

  const startTime = Date.now()
  resourceLogger.actionFlow({
    resource: "posts",
    action: "socket-update",
    step: "start",
    metadata: { count: postIds.length, previousStatus, type: "batch" },
  })

  // Fetch all posts in parallel
  const postPromises = postIds.map((id) => fetchPostRow(id))
  const rows = await Promise.all(postPromises)

  // Filter out nulls and emit events
  const validRows = rows.filter((row): row is PostRow => row !== null)
  
  if (validRows.length > 0) {
    // Emit batch event với tất cả rows
    io.to(SUPER_ADMIN_ROOM).emit("post:batch-upsert", {
      posts: validRows.map((row) => ({
        post: row,
        previousStatus,
        newStatus: resolveStatusFromRow(row),
      })),
  })

    resourceLogger.actionFlow({
      resource: "posts",
      action: "socket-update",
      step: "success",
      duration: Date.now() - startTime,
      metadata: { count: validRows.length, emitted: validRows.length, type: "batch" },
    })
  }
}

export function emitPostRemove(postId: string, previousStatus: PostStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("post:remove", {
    id: postId,
    previousStatus,
  })
}


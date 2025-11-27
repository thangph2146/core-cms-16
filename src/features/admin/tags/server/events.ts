import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapTagRecord, serializeTagForTable } from "./helpers"
import type { TagRow } from "../types"
import { resourceLogger } from "@/lib/config"

const SUPER_ADMIN_ROOM = "role:super_admin"

export type TagStatus = "active" | "deleted"

function resolveStatusFromRow(row: TagRow): TagStatus {
  return row.deletedAt ? "deleted" : "active"
}

async function fetchTagRow(tagId: string): Promise<TagRow | null> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  })

  if (!tag) {
    return null
  }

  const listed = mapTagRecord(tag)
  return serializeTagForTable(listed)
}

export async function emitTagUpsert(
  tagId: string,
  previousStatus: TagStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const row = await fetchTagRow(tagId)
  if (!row) {
    if (previousStatus) {
      emitTagRemove(tagId, previousStatus)
    }
    return
  }

  const newStatus = resolveStatusFromRow(row)

  io.to(SUPER_ADMIN_ROOM).emit("tag:upsert", {
    tag: row,
    previousStatus,
    newStatus,
  })
  resourceLogger.socket({
    resource: "tags",
    action: previousStatus === null ? "create" : previousStatus !== newStatus ? "update" : "update",
    event: "tag:upsert",
    resourceId: tagId,
    payload: { tagId, tagName: row.name, previousStatus, newStatus },
  })
}

export function emitTagRemove(tagId: string, previousStatus: TagStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("tag:remove", {
    id: tagId,
    previousStatus,
  })
  resourceLogger.socket({
    resource: "tags",
    action: "hard-delete",
    event: "tag:remove",
    resourceId: tagId,
    payload: { tagId, previousStatus },
  })
}


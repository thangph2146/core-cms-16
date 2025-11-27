import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapCategoryRecord, serializeCategoryForTable } from "./helpers"
import type { CategoryRow } from "../types"
import { resourceLogger } from "@/lib/config"

const SUPER_ADMIN_ROOM = "role:super_admin"

export type CategoryStatus = "active" | "deleted"

function resolveStatusFromRow(row: CategoryRow): CategoryStatus {
  return row.deletedAt ? "deleted" : "active"
}

async function fetchCategoryRow(categoryId: string): Promise<CategoryRow | null> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  })

  if (!category) {
    return null
  }

  const listed = mapCategoryRecord(category)
  return serializeCategoryForTable(listed)
}

export async function emitCategoryUpsert(
  categoryId: string,
  previousStatus: CategoryStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const row = await fetchCategoryRow(categoryId)
  if (!row) {
    if (previousStatus) {
      emitCategoryRemove(categoryId, previousStatus)
    }
    return
  }

  const newStatus = resolveStatusFromRow(row)

  io.to(SUPER_ADMIN_ROOM).emit("category:upsert", {
    category: row,
    previousStatus,
    newStatus,
  })
  resourceLogger.socket({
    resource: "categories",
    action: "socket-update",
    event: "category:upsert",
    resourceId: categoryId,
    payload: { categoryId, previousStatus, newStatus },
  })
}

export function emitCategoryRemove(categoryId: string, previousStatus: CategoryStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("category:remove", {
    id: categoryId,
    previousStatus,
  })
  resourceLogger.socket({
    resource: "categories",
    action: "socket-update",
    event: "category:remove",
    resourceId: categoryId,
    payload: { categoryId, previousStatus },
  })
}


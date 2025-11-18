/**
 * Socket events emission cho categories
 * Tách logic emit socket events ra khỏi mutations để code sạch hơn
 */

import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapCategoryRecord, serializeCategoryForTable } from "./helpers"
import type { CategoryRow } from "../types"
import { logger } from "@/lib/config"

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

/**
 * Emit category:upsert event
 * Được gọi khi category được tạo, cập nhật, restore
 */
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
  logger.debug("Socket category:upsert emitted", { categoryId, previousStatus, newStatus })
}

/**
 * Emit category:remove event
 * Được gọi khi category bị hard delete
 */
export function emitCategoryRemove(categoryId: string, previousStatus: CategoryStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("category:remove", {
    id: categoryId,
    previousStatus,
  })
  logger.debug("Socket category:remove emitted", { categoryId, previousStatus })
}


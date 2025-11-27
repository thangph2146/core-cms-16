import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapRoleRecord, serializeRoleForTable } from "./helpers"
import type { RoleRow } from "../types"
import { logger } from "@/lib/config"

const SUPER_ADMIN_ROOM = "role:super_admin"

export type RoleStatus = "active" | "deleted"

function resolveStatusFromRow(row: RoleRow): RoleStatus {
  return row.deletedAt ? "deleted" : "active"
}

async function fetchRoleRow(roleId: string): Promise<RoleRow | null> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
  })

  if (!role) {
    return null
  }

  const listed = mapRoleRecord(role)
  return serializeRoleForTable(listed)
}

export async function emitRoleUpsert(
  roleId: string,
  previousStatus: RoleStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const row = await fetchRoleRow(roleId)
  if (!row) {
    if (previousStatus) {
      emitRoleRemove(roleId, previousStatus)
    }
    return
  }

  const newStatus = resolveStatusFromRow(row)

  io.to(SUPER_ADMIN_ROOM).emit("role:upsert", {
    role: row,
    previousStatus,
    newStatus,
  })
  logger.debug("Socket role:upsert emitted", { roleId, previousStatus, newStatus })
}

export function emitRoleRemove(roleId: string, previousStatus: RoleStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("role:remove", {
    id: roleId,
    previousStatus,
  })
  logger.debug("Socket role:remove emitted", { roleId, previousStatus })
}


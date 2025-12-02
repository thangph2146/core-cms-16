import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapSessionRecord, serializeSessionForTable } from "./helpers"
import type { SessionRow } from "../types"

const SUPER_ADMIN_ROOM = "role:super_admin"

export type SessionStatus = "active" | "deleted"

function resolveStatusFromRow(row: SessionRow): SessionStatus {
  return row.isActive ? "active" : "deleted"
}

async function fetchSessionRow(sessionId: string): Promise<SessionRow | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!session) {
    return null
  }

  const listed = mapSessionRecord(session)
  return serializeSessionForTable({
    ...listed,
    userName: session.user?.name || null,
    userEmail: session.user?.email || "",
  })
}

export async function emitSessionUpsert(
  sessionId: string,
  previousStatus: SessionStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const row = await fetchSessionRow(sessionId)
  if (!row) {
    if (previousStatus) {
      emitSessionRemove(sessionId, previousStatus)
    }
    return
  }

  const newStatus = resolveStatusFromRow(row)

  io.to(SUPER_ADMIN_ROOM).emit("session:upsert", {
    session: row,
    previousStatus,
    newStatus,
  })
}

export function emitSessionRemove(sessionId: string, previousStatus: SessionStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("session:remove", {
    id: sessionId,
    previousStatus,
  })
}

export async function emitSessionBatchUpsert(
  sessionIds: string[],
  previousStatus: SessionStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io || sessionIds.length === 0) return

  const sessions = await prisma.session.findMany({
    where: {
      id: { in: sessionIds },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Map sessions to rows
  const rows: SessionRow[] = []
  for (const session of sessions) {
    const listed = mapSessionRecord(session)
    const row = serializeSessionForTable({
      ...listed,
      userName: session.user?.name || null,
      userEmail: session.user?.email || "",
    })
    rows.push(row)
  }

  io.to(SUPER_ADMIN_ROOM).emit("session:batch-upsert", {
    sessions: rows.map((row) => ({
      session: row,
      previousStatus,
      newStatus: resolveStatusFromRow(row),
    })),
  })
}


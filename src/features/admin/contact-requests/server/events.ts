import { prisma } from "@/lib/database"
import { getSocketServer } from "@/lib/socket/state"
import { mapContactRequestRecord, serializeContactRequestForTable } from "./helpers"
import type { ContactRequestRow } from "../types"
import type { ListedContactRequest } from "../types"

const SUPER_ADMIN_ROOM = "role:super_admin"

export type ContactRequestStatus = "active" | "deleted"

function resolveStatusFromRow(row: ContactRequestRow): ContactRequestStatus {
  return row.deletedAt ? "deleted" : "active"
}

async function fetchContactRequestRow(contactRequestId: string): Promise<ContactRequestRow | null> {
  const contactRequest = await prisma.contactRequest.findUnique({
    where: { id: contactRequestId },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!contactRequest) {
    return null
  }

  const listed = mapContactRequestRecord(contactRequest)
  return serializeContactRequestForTable(listed)
}

export async function emitContactRequestUpsert(
  contactRequestId: string,
  previousStatus: ContactRequestStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const row = await fetchContactRequestRow(contactRequestId)
  if (!row) {
    if (previousStatus) {
      emitContactRequestRemove(contactRequestId, previousStatus)
    }
    return
  }

  const newStatus = resolveStatusFromRow(row)

  const upsertPayload = {
    contactRequest: row,
    previousStatus,
    newStatus,
  }

  // Emit to role room (tất cả super admins đều ở trong role room)
  // Không cần emit đến từng user room để tránh duplicate events
  io.to(SUPER_ADMIN_ROOM).emit("contact-request:upsert", upsertPayload)
}

export function emitContactRequestRemove(contactRequestId: string, previousStatus: ContactRequestStatus): void {
  const io = getSocketServer()
  if (!io) return

  io.to(SUPER_ADMIN_ROOM).emit("contact-request:remove", {
    id: contactRequestId,
    previousStatus,
  })
}

export async function emitContactRequestAssigned(
  contactRequestId: string,
  assignedToId: string | null,
  assignedToName: string | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const payload = {
    id: contactRequestId,
    assignedToId,
    assignedToName,
  }

  // Emit to all super admins
  io.to(SUPER_ADMIN_ROOM).emit("contact-request:assigned", payload)

  // Also emit to assigned user if exists
  if (assignedToId) {
    io.to(`user:${assignedToId}`).emit("contact-request:assigned", payload)
  }
}

export async function emitContactRequestNew(contactRequest: ListedContactRequest): Promise<void> {
  const io = getSocketServer()
  if (!io) return

  const row = serializeContactRequestForTable(contactRequest)

  const payload = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt,
    assignedToId: contactRequest.assignedToId ?? null,
    assignedToName: contactRequest.assignedTo?.name ?? null,
  }

  // Emit to role room (tất cả super admins đều ở trong role room)
  // Không cần emit đến từng user room để tránh duplicate events
  io.to(SUPER_ADMIN_ROOM).emit("contact-request:new", payload)
}

export async function emitContactRequestBatchUpsert(
  contactRequestIds: string[],
  previousStatus: ContactRequestStatus | null,
): Promise<void> {
  const io = getSocketServer()
  if (!io || contactRequestIds.length === 0) return

  // Fetch tất cả contact requests trong một query
  const contactRequests = await prisma.contactRequest.findMany({
    where: {
      id: { in: contactRequestIds },
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Map contact requests to rows
  const rows: ContactRequestRow[] = []
  for (const contactRequest of contactRequests) {
    const listed = mapContactRequestRecord(contactRequest)
    const row = serializeContactRequestForTable(listed)
    rows.push(row)
  }

  // Emit batch event với tất cả rows
  // Emit to role room (tất cả super admins đều ở trong role room)
  // Không cần emit đến từng user room để tránh duplicate events
  io.to(SUPER_ADMIN_ROOM).emit("contact-request:batch-upsert", {
    contactRequests: rows,
    previousStatus,
  })
}


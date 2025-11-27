import type { Prisma } from "@prisma/client"
import type { DataTableResult } from "@/components/tables"
import {
  serializeDate,
  applyStatusFilter,
  applySearchFilter,
  applyDateFilter,
  applyStringFilter,
  applyBooleanFilter,
  applyRelationFilters,
} from "@/features/admin/resources/server"
import type { ListContactRequestsInput, ListedContactRequest, ContactRequestDetail, ListContactRequestsResult } from "../types"
import type { ContactRequestRow } from "../types"

type ContactRequestWithRelations = Prisma.ContactRequestGetPayload<{
  include: {
    assignedTo: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

export function mapContactRequestRecord(contactRequest: ContactRequestWithRelations): ListedContactRequest {
  return {
    id: contactRequest.id,
    name: contactRequest.name,
    email: contactRequest.email,
    phone: contactRequest.phone,
    subject: contactRequest.subject,
    content: contactRequest.content,
    status: contactRequest.status as ListedContactRequest["status"],
    priority: contactRequest.priority as ListedContactRequest["priority"],
    isRead: contactRequest.isRead,
    userId: contactRequest.userId,
    assignedToId: contactRequest.assignedToId,
    createdAt: contactRequest.createdAt,
    updatedAt: contactRequest.updatedAt,
    deletedAt: contactRequest.deletedAt,
    assignedTo: contactRequest.assignedTo
      ? {
          id: contactRequest.assignedTo.id,
          name: contactRequest.assignedTo.name,
          email: contactRequest.assignedTo.email,
        }
      : null,
  }
}

export function buildWhereClause(params: ListContactRequestsInput): Prisma.ContactRequestWhereInput {
  const where: Prisma.ContactRequestWhereInput = {}
  const status = params.status ?? "active"

  if (status === "NEW" || status === "IN_PROGRESS" || status === "RESOLVED" || status === "CLOSED") {
    where.status = status
    applyStatusFilter(where, "active")
  } else {
    applyStatusFilter(where, status as "active" | "deleted" | "all")
  }

  applySearchFilter(where, params.search, ["name", "email", "phone", "subject", "content"])

  if (params.filters) {
    const activeFilters = Object.entries(params.filters).filter(([, value]) => Boolean(value))
    for (const [key, rawValue] of activeFilters) {
      const value = typeof rawValue === "string" ? rawValue.trim() : ""
      if (!value) continue

      switch (key) {
        case "name":
        case "email":
        case "phone":
        case "subject":
          applyStringFilter(where, key, value)
          break
        case "status":
          if (value === "NEW" || value === "IN_PROGRESS" || value === "RESOLVED" || value === "CLOSED") {
            where.status = value as Prisma.ContactRequestWhereInput["status"]
          }
          break
        case "priority":
          if (value === "LOW" || value === "MEDIUM" || value === "HIGH" || value === "URGENT") {
            where.priority = value as Prisma.ContactRequestWhereInput["priority"]
          }
          break
        case "isRead":
          applyBooleanFilter(where, key, value)
          break
        case "assignedToId":
          where.assignedToId = value
          break
        case "createdAt":
        case "updatedAt":
        case "deletedAt":
          applyDateFilter(where, key, value)
          break
      }
    }

    applyRelationFilters(where, params.filters, {
      assignedTo: {
        idField: "assignedToId",
        fieldMap: { assignedToName: "name" },
        operators: { name: "contains" },
      },
    })
  }

  return where
}

export function serializeContactRequestForTable(contactRequest: ListedContactRequest): ContactRequestRow {
  return {
    id: contactRequest.id,
    name: contactRequest.name,
    email: contactRequest.email,
    phone: contactRequest.phone,
    subject: contactRequest.subject,
    status: contactRequest.status,
    priority: contactRequest.priority,
    isRead: contactRequest.isRead,
    assignedToName: contactRequest.assignedTo?.name || null,
    createdAt: serializeDate(contactRequest.createdAt)!,
    updatedAt: serializeDate(contactRequest.updatedAt)!,
    deletedAt: serializeDate(contactRequest.deletedAt),
  }
}

export function serializeContactRequestsList(data: ListContactRequestsResult): DataTableResult<ContactRequestRow> {
  return {
    page: data.pagination.page,
    limit: data.pagination.limit,
    total: data.pagination.total,
    totalPages: data.pagination.totalPages,
    rows: data.data.map(serializeContactRequestForTable),
  }
}

export function serializeContactRequestDetail(contactRequest: ContactRequestDetail) {
  return {
    id: contactRequest.id,
    name: contactRequest.name,
    email: contactRequest.email,
    phone: contactRequest.phone,
    subject: contactRequest.subject,
    content: contactRequest.content,
    status: contactRequest.status,
    priority: contactRequest.priority,
    isRead: contactRequest.isRead,
    userId: contactRequest.userId,
    assignedToId: contactRequest.assignedToId,
    assignedTo: contactRequest.assignedTo,
    createdAt: serializeDate(contactRequest.createdAt)!,
    updatedAt: serializeDate(contactRequest.updatedAt)!,
    deletedAt: serializeDate(contactRequest.deletedAt),
    assignedToName: contactRequest.assignedTo?.name || null,
  }
}

export type { ContactRequestWithRelations }


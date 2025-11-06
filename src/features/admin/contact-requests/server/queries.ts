/**
 * Non-cached Database Queries for Contact Requests
 * 
 * Chứa các database queries không có cache wrapper
 * Sử dụng cho các trường hợp cần fresh data hoặc trong API routes
 */

import { prisma } from "@/lib/database"
import { validatePagination, buildPagination } from "@/features/admin/resources/server"
import { mapContactRequestRecord, buildWhereClause } from "./helpers"
import type { ListContactRequestsInput, ContactRequestDetail, ListContactRequestsResult } from "../types"

export async function listContactRequests(params: ListContactRequestsInput = {}): Promise<ListContactRequestsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)

  const [data, total] = await Promise.all([
    prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.contactRequest.count({ where }),
  ])

  return {
    data: data.map(mapContactRequestRecord),
    pagination: buildPagination(page, limit, total),
  }
}

export async function getContactRequestById(id: string): Promise<ContactRequestDetail | null> {
  const contactRequest = await prisma.contactRequest.findUnique({
    where: { id },
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

  return mapContactRequestRecord(contactRequest)
}


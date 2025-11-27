import type { Prisma } from "@prisma/client"
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
      orderBy: { updatedAt: "desc" },
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

export async function getContactRequestColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.ContactRequestWhereInput = {
    deletedAt: null, // Only active contact requests
  }

  // Add search filter if provided
  if (search && search.trim()) {
    const searchValue = search.trim()
    switch (column) {
      case "name":
        where.name = { contains: searchValue, mode: "insensitive" }
        break
      case "email":
        where.email = { contains: searchValue, mode: "insensitive" }
        break
      case "phone":
        where.phone = { contains: searchValue, mode: "insensitive" }
        break
      case "subject":
        where.subject = { contains: searchValue, mode: "insensitive" }
        break
      default:
        where.name = { contains: searchValue, mode: "insensitive" }
    }
  }

  // Build select based on column
  let selectField: Prisma.ContactRequestSelect
  switch (column) {
    case "name":
      selectField = { name: true }
      break
    case "email":
      selectField = { email: true }
      break
    case "phone":
      selectField = { phone: true }
      break
    case "subject":
      selectField = { subject: true }
      break
    default:
      selectField = { name: true }
  }

  const results = await prisma.contactRequest.findMany({
    where,
    select: selectField,
    orderBy: { [column]: "asc" },
    take: limit,
  })

  // Map results to options format
  return results
    .map((item) => {
      const value = item[column as keyof typeof item]
      if (typeof value === "string" && value.trim()) {
        return {
          label: value,
          value: value,
        }
      }
      return null
    })
    .filter((item): item is { label: string; value: string } => item !== null)
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


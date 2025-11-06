/**
 * Server Component: Contact Requests Table
 * 
 * Fetches initial data và users options, sau đó pass xuống client component
 * Pattern: Server Component (data fetching) → Client Component (UI/interactions)
 */

import { listContactRequestsCached } from "../server/cache"
import { serializeContactRequestsList } from "../server/helpers"
import { ContactRequestsTableClient } from "./contact-requests-table.client"
import { prisma } from "@/lib/database"

export interface ContactRequestsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canUpdate?: boolean
  canAssign?: boolean
}

export async function ContactRequestsTable({ canDelete, canRestore, canManage, canUpdate, canAssign }: ContactRequestsTableProps) {
  const [contactRequestsData, users] = await Promise.all([
    listContactRequestsCached({
      page: 1,
      limit: 10,
      status: "active",
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <ContactRequestsTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canUpdate={canUpdate}
      canAssign={canAssign}
      initialData={serializeContactRequestsList(contactRequestsData)}
      initialUsersOptions={users.map((user) => ({
        label: user.name || user.email,
        value: user.id,
      }))}
    />
  )
}


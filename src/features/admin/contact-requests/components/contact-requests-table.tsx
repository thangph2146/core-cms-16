import { listContactRequests } from "../server/queries"
import { serializeContactRequestsList } from "../server/helpers"
import { ContactRequestsTableClient } from "./contact-requests-table.client"
import { getActiveUsersForSelect } from "@/features/admin/users/server/queries"

export interface ContactRequestsTableProps {
  canDelete?: boolean
  canRestore?: boolean
  canManage?: boolean
  canUpdate?: boolean
  canAssign?: boolean
}

export async function ContactRequestsTable({ canDelete, canRestore, canManage, canUpdate, canAssign }: ContactRequestsTableProps) {
  // Sử dụng non-cached functions để đảm bảo data luôn fresh
  // Theo chuẩn Next.js 16: không cache admin data
  const [contactRequestsData, usersOptions] = await Promise.all([
    listContactRequests({
      page: 1,
      limit: 10,
      status: "active",
    }),
    getActiveUsersForSelect(100),
  ])

  return (
    <ContactRequestsTableClient
      canDelete={canDelete}
      canRestore={canRestore}
      canManage={canManage}
      canUpdate={canUpdate}
      canAssign={canAssign}
      initialData={serializeContactRequestsList(contactRequestsData)}
      initialUsersOptions={usersOptions}
    />
  )
}


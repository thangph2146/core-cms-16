import type { ResourceResponse, BaseResourceTableClientProps, ResourcePagination, BulkActionResult } from "@/features/admin/resources/types"

export type ContactStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
export type ContactPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export interface ContactRequestRow {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  status: ContactStatus
  priority: ContactPriority
  isRead: boolean
  assignedToName: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

 
export interface ContactRequestsTableClientProps extends BaseResourceTableClientProps<ContactRequestRow> {
  canAssign?: boolean
  initialUsersOptions?: Array<{ label: string; value: string }>
}

export type ContactRequestsResponse = ResourceResponse<ContactRequestRow>

export interface ListContactRequestsInput {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string>
  status?: "active" | "deleted" | "all" | ContactStatus
}

export interface ListedContactRequest {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  content: string
  status: ContactStatus
  priority: ContactPriority
  isRead: boolean
  userId: string | null
  assignedToId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  assignedTo: {
    id: string
    name: string | null
    email: string
  } | null
}

export type ContactRequestDetail = ListedContactRequest

export interface ListContactRequestsResult {
  data: ListedContactRequest[]
  pagination: ResourcePagination
}

export interface CreateContactRequestInput {
  name: string
  email: string
  phone?: string | null
  subject: string
  content: string
  status?: ContactStatus
  priority?: ContactPriority
}

export interface UpdateContactRequestInput {
  name?: string
  email?: string
  phone?: string | null
  subject?: string
  content?: string
  status?: ContactStatus
  priority?: ContactPriority
  assignedToId?: string | null
  isRead?: boolean
}

export type { BulkActionResult }


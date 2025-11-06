/**
 * Cached Database Queries for Contact Requests
 * 
 * Sử dụng React.cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components để tối ưu performance
 */

import { cache } from "react"
import { listContactRequests, getContactRequestById } from "./queries"
import type { ListContactRequestsInput, ListContactRequestsResult, ContactRequestDetail } from "../types"

/**
 * Cache function: List contact requests
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param params - ListContactRequestsInput
 * @returns ListContactRequestsResult
 */
export const listContactRequestsCached = cache(async (params: ListContactRequestsInput = {}): Promise<ListContactRequestsResult> => {
  return listContactRequests(params)
})

/**
 * Cache function: Get contact request by ID
 * 
 * Sử dụng cache() để tự động deduplicate requests và cache kết quả
 * Dùng cho Server Components
 * 
 * @param id - Contact Request ID
 * @returns ContactRequestDetail | null
 */
export const getContactRequestDetailById = cache(async (id: string): Promise<ContactRequestDetail | null> => {
  return getContactRequestById(id)
})


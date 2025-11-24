/**
 * API Route: GET /api/admin/conversations - List conversations or get messages
 * 
 * Theo Next.js 16 best practices:
 * - Sử dụng createApiRoute wrapper để handle authentication và permissions
 * - Import queries từ features/admin/chat/server/queries (không sử dụng cache)
 * - Validate input và return proper error responses
 * - Support query params: otherUserId (optional) để get messages
 */

import { NextRequest, NextResponse } from "next/server"
import { createGetRoute } from "@/lib/api/api-route-wrapper"
import { listConversations, getMessagesBetweenUsers } from "@/features/admin/chat/server/queries"
import { getUserId } from "@/lib/api/api-route-helpers"
import type { ApiRouteContext } from "@/lib/api/types"

async function getConversationsHandler(req: NextRequest, context: ApiRouteContext) {
  const userId = getUserId(context)

  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const search = searchParams.get("search") || undefined

  const result = await listConversations({ userId, page, limit, search })
  return NextResponse.json(result)
}

async function getMessagesHandler(req: NextRequest, context: ApiRouteContext) {
  const userId = getUserId(context)
  const searchParams = req.nextUrl.searchParams
  const otherUserId = searchParams.get("otherUserId")
  const limit = parseInt(searchParams.get("limit") || "100", 10)

  if (!otherUserId) {
    return NextResponse.json({ error: "otherUserId is required" }, { status: 400 })
  }

  const messages = await getMessagesBetweenUsers(userId, otherUserId, limit)
  return NextResponse.json(messages)
}

export const GET = createGetRoute(async (req: NextRequest, context: ApiRouteContext) => {
  const searchParams = req.nextUrl.searchParams
  const otherUserId = searchParams.get("otherUserId")
  return otherUserId ? getMessagesHandler(req, context) : getConversationsHandler(req, context)
})


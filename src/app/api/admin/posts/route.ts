/**
 * API Route: GET /api/admin/posts - List posts
 * POST /api/admin/posts - Create post
 */
import { NextRequest, NextResponse } from "next/server"
import { listPostsCached } from "@/features/admin/posts/server/cache"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"
import { isSuperAdmin } from "@/lib/permissions"
import { createPost, type AuthContext, ApplicationError } from "@/features/admin/posts/server/mutations"
import { createPostSchema } from "@/features/admin/posts/server/validation"

async function getPostsHandler(req: NextRequest, context: ApiRouteContext) {
  const searchParams = req.nextUrl.searchParams

  const paginationValidation = validatePagination({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  })

  if (!paginationValidation.valid) {
    return NextResponse.json({ error: paginationValidation.error }, { status: 400 })
  }

  const searchValidation = sanitizeSearchQuery(searchParams.get("search") || "", 200)
  const statusParam = searchParams.get("status") || "active"
  const status = statusParam === "deleted" || statusParam === "all" ? statusParam : "active"

  const columnFilters: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter[")) {
      const columnKey = key.replace("filter[", "").replace("]", "")
      const sanitizedValue = sanitizeSearchQuery(value, 100)
      if (sanitizedValue.valid && sanitizedValue.value) {
        columnFilters[columnKey] = sanitizedValue.value
      }
    }
  })

  // Chỉ super admin mới thấy tất cả bài viết, user khác chỉ thấy bài viết của chính mình
  const roles = context.session?.roles ?? []
  const isSuperAdminUser = isSuperAdmin(roles)
  
  // Nếu không phải super admin, filter theo authorId của user đang đăng nhập
  if (!isSuperAdminUser && context.session?.user?.id) {
    columnFilters.authorId = context.session.user.id
  }

  const activeFilters = Object.keys(columnFilters).length > 0 ? columnFilters : undefined
  const result = await listPostsCached({
    page: paginationValidation.page!,
    limit: paginationValidation.limit!,
    search: searchValidation.value || undefined,
    filters: activeFilters,
    status: status as "active" | "deleted" | "all",
  })

  return NextResponse.json(result)
}

async function postPostsHandler(req: NextRequest, context: ApiRouteContext) {
  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại." }, { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  // Nếu không phải super admin, tự động set authorId = actorId
  const roles = context.session?.roles ?? []
  const isSuperAdminUser = isSuperAdmin(roles)
  if (!isSuperAdminUser && context.session?.user?.id) {
    payload.authorId = context.session.user.id
  }

  // Validate body với Zod schema
  const validationResult = createPostSchema.safeParse(payload)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return NextResponse.json({ error: firstError?.message || "Dữ liệu không hợp lệ" }, { status: 400 })
  }

  try {
    const created = await createPost(ctx, validationResult.data)
    return NextResponse.json({ data: created })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json({ error: error.message || "Không thể tạo bài viết" }, { status: error.status || 400 })
    }
    console.error("Error creating post:", error)
    return NextResponse.json({ error: "Đã xảy ra lỗi khi tạo bài viết" }, { status: 500 })
  }
}

export const GET = createGetRoute(getPostsHandler)
export const POST = createPostRoute(postPostsHandler)


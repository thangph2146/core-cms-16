/**
 * API Route: GET /api/admin/students - List students
 * POST /api/admin/students - Create student
 */
import { NextRequest } from "next/server"
import { listStudents } from "@/features/admin/students/server/queries"
import { serializeStudentsList } from "@/features/admin/students/server/helpers"
import {
  createStudent,
  type AuthContext,
  ApplicationError,
  NotFoundError,
} from "@/features/admin/students/server/mutations"
import { CreateStudentSchema } from "@/features/admin/students/server/schemas"
import { createGetRoute, createPostRoute } from "@/lib/api/api-route-wrapper"
import type { ApiRouteContext } from "@/lib/api/types"
import { validatePagination, sanitizeSearchQuery } from "@/lib/api/validation"
import { createSuccessResponse, createErrorResponse } from "@/lib/config"
import { isSuperAdmin } from "@/lib/permissions"
import { StudentsResponse } from "@/features/admin/students/types"

async function getStudentsHandler(req: NextRequest, context: ApiRouteContext) {
  const searchParams = req.nextUrl.searchParams

  const paginationValidation = validatePagination({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  })

  if (!paginationValidation.valid) {
    return createErrorResponse(paginationValidation.error || "Invalid pagination parameters", { status: 400 })
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

  // Check if user is super admin
  const actorId = context.session.user?.id
  const isSuperAdminUser = isSuperAdmin(context.roles)

  // Sử dụng listStudents (non-cached) thay vì listStudentsCached để đảm bảo data luôn fresh
  // API routes cần fresh data, không nên sử dụng cache để tránh trả về dữ liệu cũ
  const result = await listStudents({
    page: paginationValidation.page,
    limit: paginationValidation.limit,
    search: searchValidation.value || undefined,
    filters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
    status,
    actorId,
    isSuperAdmin: isSuperAdminUser,
  })

  // Serialize result to match StudentsResponse format
  const serialized = serializeStudentsList(result)
  return createSuccessResponse({
    data: serialized.rows,
    pagination: {
      page: serialized.page,
      limit: serialized.limit,
      total: serialized.total,
      totalPages: serialized.totalPages,
    },
  } as StudentsResponse)
}

async function postStudentsHandler(req: NextRequest, context: ApiRouteContext) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return createErrorResponse("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.", { status: 400 })
  }

  // Validate body với Zod schema
  const validationResult = CreateStudentSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return createErrorResponse(firstError?.message || "Dữ liệu không hợp lệ", { status: 400 })
  }

  const ctx: AuthContext = {
    actorId: context.session.user?.id ?? "unknown",
    permissions: context.permissions,
    roles: context.roles,
  }

  try {
    const student = await createStudent(ctx, validationResult.data)
    // Serialize student to client format (dates to strings)
    const serialized = {
      id: student.id,
      userId: student.userId,
      name: student.name,
      email: student.email,
      studentCode: student.studentCode,
      isActive: student.isActive,
      createdAt: student.createdAt,
      deletedAt: student.deletedAt,
    }
    return createSuccessResponse(serialized, { status: 201 })
  } catch (error) {
    if (error instanceof ApplicationError) {
      return createErrorResponse(error.message || "Không thể tạo học sinh", { status: error.status || 400 })
    }
    if (error instanceof NotFoundError) {
      return createErrorResponse(error.message || "Không tìm thấy", { status: 404 })
    }
    console.error("Error creating student:", error)
    return createErrorResponse("Đã xảy ra lỗi khi tạo học sinh", { status: 500 })
  }
}

export const GET = createGetRoute(getStudentsHandler)
export const POST = createPostRoute(postStudentsHandler)


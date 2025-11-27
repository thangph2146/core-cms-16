import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/database"
import { resourceLogger } from "@/lib/config"
import { validatePagination, buildPagination } from "@/features/admin/resources/server"
import { mapCommentRecord, buildWhereClause } from "./helpers"
import type { ListCommentsInput, CommentDetail, ListCommentsResult } from "../types"

export async function listComments(params: ListCommentsInput = {}): Promise<ListCommentsResult> {
  const { page, limit } = validatePagination(params.page, params.limit, 100)
  const where = buildWhereClause(params)
  const status = params.filters?.deleted === true ? "deleted" : "active"

  resourceLogger.actionFlow({
    resource: "comments",
    action: "query",
    step: "start",
    metadata: { status, page, limit, where: Object.keys(where).length > 0 ? "filtered" : "all" },
  })

  const [data, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true } },
        post: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.comment.count({ where }),
  ])

  const result = { data: data.map(mapCommentRecord), pagination: buildPagination(page, limit, total) }

  resourceLogger.actionFlow({
    resource: "comments",
    action: "query",
    step: "success",
    metadata: { page, limit, total, dataCount: data.length, where },
  })

  return result
}

export async function getCommentColumnOptions(
  column: string,
  search?: string,
  limit: number = 50
): Promise<Array<{ label: string; value: string }>> {
  const where: Prisma.CommentWhereInput = { deletedAt: null }

  if (search?.trim()) {
    const s = search.trim()
    const columnMap: Record<string, () => void> = {
      content: () => { where.content = { contains: s, mode: "insensitive" } },
      authorName: () => { where.author = { name: { contains: s, mode: "insensitive" } } },
      authorEmail: () => { where.author = { email: { contains: s, mode: "insensitive" } } },
      postTitle: () => { where.post = { title: { contains: s, mode: "insensitive" } } },
    }
    ;(columnMap[column] || columnMap.content)()
  }

  const results = await prisma.comment.findMany({
    where,
    include: {
      author: { select: { name: true, email: true } },
      post: { select: { title: true } },
    },
    take: limit,
  })

  const optionsMap = new Map<string, string>()
  for (const item of results) {
    let value: string | null = null
    let label: string | null = null

    if (column === "content") {
      value = item.content
      label = item.content.length > 50 ? item.content.substring(0, 50) + "..." : item.content
    } else if (column === "authorName") {
      value = item.author.name || item.author.email
      label = value
    } else if (column === "authorEmail") {
      value = item.author.email
      label = value
    } else if (column === "postTitle") {
      value = item.post.title
      label = value
    }

    if (value && !optionsMap.has(value)) {
      optionsMap.set(value, label || value)
    }
  }

  return Array.from(optionsMap.entries()).map(([value, label]) => ({ label, value }))
}

export async function getCommentById(id: string): Promise<CommentDetail | null> {
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      post: { select: { id: true, title: true } },
    },
  })

  return comment ? { ...mapCommentRecord(comment), updatedAt: comment.updatedAt.toISOString() } : null
}


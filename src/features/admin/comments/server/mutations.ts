"use server"

/**
 * CRUD Operations for Comments
 * 
 * Tất cả mutations đều sử dụng Zod validation và emit realtime notifications
 */

import { PERMISSIONS, canPerformAnyAction } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { logger } from "@/lib/config"
import { mapCommentRecord, type CommentWithRelations } from "./helpers"
import type { ListedComment } from "../types"
import type { BulkActionResult } from "../types"
import {
  UpdateCommentSchema,
  type UpdateCommentInput,
} from "./schemas"
import { notifySuperAdminsOfCommentAction } from "./notifications"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  invalidateResourceCache,
  invalidateResourceCacheBulk,
  type AuthContext,
} from "@/features/admin/resources/server"
import { emitCommentUpsert, emitCommentRemove } from "./events"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

function sanitizeComment(comment: CommentWithRelations): ListedComment {
  return mapCommentRecord(comment)
}

export async function updateComment(ctx: AuthContext, id: string, input: UpdateCommentInput): Promise<ListedComment> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_MANAGE)

  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new ApplicationError("ID bình luận không hợp lệ", 400)
  }

  // Validate input với zod
  const validatedInput = UpdateCommentSchema.parse(input)

  const existing = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!existing || existing.deletedAt) {
    throw new NotFoundError("Bình luận không tồn tại")
  }

  // Track changes for notification
  const changes: {
    content?: { old: string; new: string }
    approved?: { old: boolean; new: boolean }
  } = {}

  const updateData: {
    content?: string
    approved?: boolean
  } = {}

  if (validatedInput.content !== undefined) {
    const trimmedContent = validatedInput.content.trim()
    if (trimmedContent !== existing.content) {
      changes.content = { old: existing.content, new: trimmedContent }
    }
    updateData.content = trimmedContent
  }

  if (validatedInput.approved !== undefined) {
    if (validatedInput.approved !== existing.approved) {
      changes.approved = { old: existing.approved, new: validatedInput.approved }
    }
    updateData.approved = validatedInput.approved
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: updateData,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  const sanitized = sanitizeComment(comment)

  // Emit notification realtime
  await notifySuperAdminsOfCommentAction(
    "update",
    ctx.actorId,
    {
      id: sanitized.id,
      content: sanitized.content,
      authorName: sanitized.authorName,
      authorEmail: sanitized.authorEmail,
      postTitle: sanitized.postTitle,
    },
    Object.keys(changes).length > 0 ? changes : undefined
  )

  await emitCommentUpsert(comment.id, existing.deletedAt ? "deleted" : "active")

  // Invalidate cache - QUAN TRỌNG: phải invalidate detail page để cập nhật ngay
  await invalidateResourceCache({ resource: "comments", id })

  return sanitized
}

export async function approveComment(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_APPROVE, PERMISSIONS.COMMENTS_MANAGE)

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!comment || comment.deletedAt) {
    throw new NotFoundError("Bình luận không tồn tại")
  }

  if (comment.approved) {
    throw new ApplicationError("Bình luận đã được duyệt", 400)
  }

  await prisma.comment.update({
    where: { id },
    data: { approved: true },
  })

  // Emit notification realtime
  await notifySuperAdminsOfCommentAction(
    "approve",
    ctx.actorId,
    {
      id: comment.id,
      content: comment.content,
      authorName: comment.author.name,
      authorEmail: comment.author.email,
      postTitle: comment.post.title,
    }
  )

  await emitCommentUpsert(comment.id, comment.deletedAt ? "deleted" : "active")

  // Invalidate cache
  await invalidateResourceCache({ resource: "comments", id })
}

export async function unapproveComment(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_APPROVE, PERMISSIONS.COMMENTS_MANAGE)

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!comment || comment.deletedAt) {
    throw new NotFoundError("Bình luận không tồn tại")
  }

  if (!comment.approved) {
    throw new ApplicationError("Bình luận chưa được duyệt", 400)
  }

  await prisma.comment.update({
    where: { id },
    data: { approved: false },
  })

  // Emit notification realtime
  await notifySuperAdminsOfCommentAction(
    "unapprove",
    ctx.actorId,
    {
      id: comment.id,
      content: comment.content,
      authorName: comment.author.name,
      authorEmail: comment.author.email,
      postTitle: comment.post.title,
    }
  )

  await emitCommentUpsert(comment.id, comment.deletedAt ? "deleted" : "active")

  // Invalidate cache
  await invalidateResourceCache({ resource: "comments", id })
}

export async function softDeleteComment(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_DELETE, PERMISSIONS.COMMENTS_MANAGE)

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!comment || comment.deletedAt) {
    throw new NotFoundError("Bình luận không tồn tại")
  }

  await prisma.comment.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  })

  // Emit notification realtime
  await notifySuperAdminsOfCommentAction(
    "delete",
    ctx.actorId,
    {
      id: comment.id,
      content: comment.content,
      authorName: comment.author.name,
      authorEmail: comment.author.email,
      postTitle: comment.post.title,
    }
  )

  await emitCommentUpsert(comment.id, "active")

  // Invalidate cache
  await invalidateResourceCache({ resource: "comments", id })
}

export async function bulkSoftDeleteComments(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_DELETE, PERMISSIONS.COMMENTS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách bình luận trống", 400)
  }

  // Lấy thông tin comments trước khi delete để tạo notifications
  const comments = await prisma.comment.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  const result = await prisma.comment.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = comments.map((comment) => 
      emitCommentUpsert(comment.id, "active").catch((error) => {
        logger.error(`Failed to emit comment:upsert for ${comment.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Emit notifications realtime cho từng comment
    for (const comment of comments) {
      await notifySuperAdminsOfCommentAction(
        "delete",
        ctx.actorId,
        {
          id: comment.id,
          content: comment.content,
          authorName: comment.author.name,
          authorEmail: comment.author.email,
          postTitle: comment.post.title,
        }
      )
    }
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({ resource: "comments" })

  return { success: true, message: `Đã xóa ${result.count} bình luận`, affected: result.count }
}

export async function restoreComment(ctx: AuthContext, id: string): Promise<void> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_MANAGE)

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!comment || !comment.deletedAt) {
    throw new NotFoundError("Bình luận không tồn tại hoặc chưa bị xóa")
  }

  await prisma.comment.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  })

  // Emit notification realtime
  await notifySuperAdminsOfCommentAction(
    "restore",
    ctx.actorId,
    {
      id: comment.id,
      content: comment.content,
      authorName: comment.author.name,
      authorEmail: comment.author.email,
      postTitle: comment.post.title,
    }
  )

  await emitCommentUpsert(comment.id, "deleted")

  // Invalidate cache
  await invalidateResourceCache({ resource: "comments", id })
}

export async function bulkRestoreComments(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách bình luận trống", 400)
  }

  // Lấy thông tin comments trước khi restore để tạo notifications
  const comments = await prisma.comment.findMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  const result = await prisma.comment.updateMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    data: {
      deletedAt: null,
    },
  })

  // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
  // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
  if (result.count > 0) {
    // Emit events song song và await tất cả để đảm bảo hoàn thành
    const emitPromises = comments.map((comment) => 
      emitCommentUpsert(comment.id, "deleted").catch((error) => {
        logger.error(`Failed to emit comment:upsert for ${comment.id}`, error as Error)
        return null // Return null để Promise.allSettled không throw
      })
    )
    // Await tất cả events nhưng không fail nếu một số lỗi
    await Promise.allSettled(emitPromises)

    // Emit notifications realtime cho từng comment
    for (const comment of comments) {
      await notifySuperAdminsOfCommentAction(
        "restore",
        ctx.actorId,
        {
          id: comment.id,
          content: comment.content,
          authorName: comment.author.name,
          authorEmail: comment.author.email,
          postTitle: comment.post.title,
        }
      )
    }
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({ resource: "comments" })

  return { success: true, message: `Đã khôi phục ${result.count} bình luận`, affected: result.count }
}

export async function hardDeleteComment(ctx: AuthContext, id: string): Promise<void> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.COMMENTS_MANAGE])) {
    throw new ForbiddenError()
  }

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!comment) {
    throw new NotFoundError("Bình luận không tồn tại")
  }

  // Chỉ cho phép hard delete khi comment đã bị soft delete
  if (!comment.deletedAt) {
    throw new ApplicationError("Chỉ có thể xóa vĩnh viễn bình luận đã bị xóa", 400)
  }

  await prisma.comment.delete({
    where: { id },
  })

  // Emit notification realtime
  await notifySuperAdminsOfCommentAction(
    "hard-delete",
    ctx.actorId,
    {
      id: comment.id,
      content: comment.content,
      authorName: comment.author.name,
      authorEmail: comment.author.email,
      postTitle: comment.post.title,
    }
  )

  emitCommentRemove(comment.id, "deleted")

  // Invalidate cache
  await invalidateResourceCache({ resource: "comments", id })
}

export async function bulkHardDeleteComments(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  if (!canPerformAnyAction(ctx.permissions, ctx.roles, [PERMISSIONS.COMMENTS_MANAGE])) {
    throw new ForbiddenError()
  }

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách bình luận trống", 400)
  }

  // Lấy thông tin comments trước khi delete để tạo notifications
  // Chỉ lấy các comments đã bị soft delete
  const comments = await prisma.comment.findMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  const result = await prisma.comment.deleteMany({
    where: {
      id: { in: ids },
      deletedAt: { not: null },
    },
  })

  // Emit socket events để update UI - fire and forget để tránh timeout
  // Emit song song cho tất cả comments đã bị hard delete
  if (result.count > 0) {
    // Emit events (emitCommentRemove trả về void, không phải Promise)
    comments.forEach((comment) => {
      try {
        emitCommentRemove(comment.id, "deleted")
      } catch (error) {
        logger.error(`Failed to emit comment:remove for ${comment.id}`, error as Error)
      }
    })

    // Emit notifications realtime cho từng comment
    for (const comment of comments) {
      await notifySuperAdminsOfCommentAction(
        "hard-delete",
        ctx.actorId,
        {
          id: comment.id,
          content: comment.content,
          authorName: comment.author.name,
          authorEmail: comment.author.email,
          postTitle: comment.post.title,
        }
      )
    }
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({ resource: "comments" })

  return { success: true, message: `Đã xóa vĩnh viễn ${result.count} bình luận`, affected: result.count }
}

export async function bulkApproveComments(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_APPROVE, PERMISSIONS.COMMENTS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách bình luận trống", 400)
  }

  // Lấy thông tin comments trước khi approve để tạo notifications
  const comments = await prisma.comment.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
      approved: false,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  const result = await prisma.comment.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
      approved: false,
    },
    data: {
      approved: true,
    },
  })

  // Emit notifications realtime cho từng comment
  for (const comment of comments) {
    await notifySuperAdminsOfCommentAction(
      "approve",
      ctx.actorId,
      {
        id: comment.id,
        content: comment.content,
        authorName: comment.author.name,
        authorEmail: comment.author.email,
        postTitle: comment.post.title,
      }
    )
    await emitCommentUpsert(comment.id, comment.deletedAt ? "deleted" : "active")
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({ resource: "comments" })

  return { success: true, message: `Đã duyệt ${result.count} bình luận`, affected: result.count }
}

export async function bulkUnapproveComments(ctx: AuthContext, ids: string[]): Promise<BulkActionResult> {
  ensurePermission(ctx, PERMISSIONS.COMMENTS_APPROVE, PERMISSIONS.COMMENTS_MANAGE)

  if (!ids || ids.length === 0) {
    throw new ApplicationError("Danh sách bình luận trống", 400)
  }

  // Lấy thông tin comments trước khi unapprove để tạo notifications
  const comments = await prisma.comment.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
      approved: true,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  const result = await prisma.comment.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
      approved: true,
    },
    data: {
      approved: false,
    },
  })

  // Emit notifications realtime cho từng comment
  for (const comment of comments) {
    await notifySuperAdminsOfCommentAction(
      "unapprove",
      ctx.actorId,
      {
        id: comment.id,
        content: comment.content,
        authorName: comment.author.name,
        authorEmail: comment.author.email,
        postTitle: comment.post.title,
      }
    )
    await emitCommentUpsert(comment.id, comment.deletedAt ? "deleted" : "active")
  }

  // Invalidate cache cho bulk operation
  await invalidateResourceCacheBulk({ resource: "comments" })

  return { success: true, message: `Đã hủy duyệt ${result.count} bình luận`, affected: result.count }
}


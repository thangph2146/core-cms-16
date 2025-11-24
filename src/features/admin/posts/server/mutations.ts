"use server"

import type { Prisma } from "@prisma/client"
import { PERMISSIONS } from "@/lib/permissions"
import { isSuperAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapPostRecord, type PostWithAuthor } from "./helpers"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  logTableStatusAfterMutation,
  logActionFlow,
  logDetailAction,
  type AuthContext,
} from "@/features/admin/resources/server"
import type { BulkActionResult } from "@/features/admin/resources/types"
import { emitPostUpsert, emitPostRemove, emitBatchPostUpsert, type PostStatus } from "./events"
import { createPostSchema, updatePostSchema, type CreatePostSchema, type UpdatePostSchema } from "./validation"
import { notifySuperAdminsOfPostAction, notifySuperAdminsOfBulkPostAction } from "./notifications"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext, type BulkActionResult }

function sanitizePost(post: PostWithAuthor) {
  return mapPostRecord(post)
}

export async function createPost(ctx: AuthContext, input: CreatePostSchema) {
  const startTime = Date.now()
  
  logActionFlow("posts", "create", "start", { actorId: ctx.actorId })
  ensurePermission(ctx, PERMISSIONS.POSTS_CREATE, PERMISSIONS.POSTS_MANAGE)

  const validated = createPostSchema.parse(input)

  // Chỉ super admin mới được chọn tác giả khác, user khác chỉ được set là chính mình
  const isSuperAdminUser = isSuperAdmin(ctx.roles)
  if (!isSuperAdminUser && validated.authorId !== ctx.actorId) {
    throw new ForbiddenError("Bạn không có quyền tạo bài viết cho người khác")
  }

  // Check if slug already exists
  const existing = await prisma.post.findUnique({ where: { slug: validated.slug } })
  if (existing) {
    throw new ApplicationError("Slug đã tồn tại", 400)
  }

  // If published, set publishedAt to now if not provided
  const publishedAt = validated.published && !validated.publishedAt ? new Date() : validated.publishedAt

  // Create post with categories and tags using transaction
  const post = await prisma.$transaction(async (tx) => {
    // Create post first
    const createdPost = await tx.post.create({
      data: {
        title: validated.title,
        content: validated.content as Prisma.InputJsonValue,
        excerpt: validated.excerpt,
        slug: validated.slug,
        image: validated.image,
        published: validated.published ?? false,
        publishedAt: publishedAt,
        authorId: validated.authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create categories if provided
    if (validated.categoryIds && validated.categoryIds.length > 0) {
      await tx.postCategory.createMany({
        data: validated.categoryIds.map((categoryId) => ({
          postId: createdPost.id,
          categoryId,
        })),
        skipDuplicates: true,
      })
    }

    // Create tags if provided
    if (validated.tagIds && validated.tagIds.length > 0) {
      await tx.postTag.createMany({
        data: validated.tagIds.map((tagId) => ({
          postId: createdPost.id,
          tagId,
        })),
        skipDuplicates: true,
      })
    }

    return createdPost
  })

  const sanitized = sanitizePost(post as PostWithAuthor)

  // Emit socket event for real-time updates
  await emitPostUpsert(sanitized.id, null)


  // Notify super admins
  await notifySuperAdminsOfPostAction("create", ctx.actorId, {
    id: sanitized.id,
    title: sanitized.title,
    slug: sanitized.slug,
  })

  logActionFlow("posts", "create", "success", { postId: sanitized.id, postTitle: sanitized.title }, startTime)
  logDetailAction("posts", "create", sanitized.id, sanitized as unknown as Record<string, unknown>)

  return sanitized
}

export async function updatePost(
  ctx: AuthContext,
  postId: string,
  input: UpdatePostSchema
) {
  const startTime = Date.now()
  
  logActionFlow("posts", "update", "start", { postId, actorId: ctx.actorId })
  ensurePermission(ctx, PERMISSIONS.POSTS_UPDATE, PERMISSIONS.POSTS_MANAGE)

  const validated = updatePostSchema.parse(input)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    logActionFlow("posts", "update", "error", { postId, error: "Post not found" })
    throw new NotFoundError("Bài viết không tồn tại")
  }

  // Track changes for notification
  const changes: {
    title?: { old: string; new: string }
    published?: { old: boolean; new: boolean }
  } = {}
  if (validated.title !== undefined && validated.title !== existing.title) {
    changes.title = { old: existing.title, new: validated.title }
  }
  if (validated.published !== undefined && validated.published !== existing.published) {
    changes.published = { old: existing.published, new: validated.published }
  }

  // Chỉ super admin mới được thay đổi tác giả, user khác không được phép
  const isSuperAdminUser = isSuperAdmin(ctx.roles)
  if (validated.authorId !== undefined) {
    if (!isSuperAdminUser) {
      throw new ForbiddenError("Bạn không có quyền thay đổi tác giả bài viết")
    }
    // Super admin có thể thay đổi tác giả
  }

  // Check if slug is being changed and if new slug already exists
  if (validated.slug && validated.slug !== existing.slug) {
    const slugExists = await prisma.post.findUnique({ where: { slug: validated.slug } })
    if (slugExists) {
      throw new ApplicationError("Slug đã tồn tại", 400)
    }
  }

  // If published is being set to true and publishedAt is not set, set it to now
  let publishedAt = validated.publishedAt
  if (validated.published === true && !existing.publishedAt && !publishedAt) {
    publishedAt = new Date()
  } else if (validated.published === false) {
    publishedAt = null
  } else if (validated.published === true && existing.publishedAt && !publishedAt) {
    publishedAt = existing.publishedAt
  }

  const updateData: Prisma.PostUpdateInput = {}
  
  if (validated.title !== undefined) updateData.title = validated.title
  if (validated.content !== undefined) updateData.content = validated.content as Prisma.InputJsonValue
  if (validated.excerpt !== undefined) updateData.excerpt = validated.excerpt
  if (validated.slug !== undefined) updateData.slug = validated.slug
  if (validated.image !== undefined) updateData.image = validated.image
  if (validated.published !== undefined) {
    updateData.published = validated.published
    // Always update publishedAt when published changes
    updateData.publishedAt = publishedAt
  } else if (publishedAt !== undefined) {
    // Only update publishedAt if published is not being changed
    updateData.publishedAt = publishedAt
  }
  if (validated.authorId !== undefined && isSuperAdminUser) {
    // Update author relation using connect
    updateData.author = {
      connect: { id: validated.authorId },
    }
  }

  // Handle categories and tags update using transaction
  const post = await prisma.$transaction(async (tx) => {
    // Update post basic fields - chỉ update nếu có thay đổi
    let updatedPost
    if (Object.keys(updateData).length > 0) {
      try {
        updatedPost = await tx.post.update({
          where: { id: postId },
          data: updateData,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      } catch (error) {
        logActionFlow("posts", "update", "error", {
          postId,
          error: error instanceof Error ? error.message : String(error),
          updateData,
        })
        throw error
      }
    } else {
      // Nếu không có updateData, vẫn cần fetch với relations
      updatedPost = await tx.post.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
      if (!updatedPost) {
        throw new NotFoundError("Bài viết không tồn tại")
      }
    }

    // Handle categories update
    if (validated.categoryIds !== undefined) {
      // Delete existing categories
      await tx.postCategory.deleteMany({
        where: { postId },
      })
      // Create new categories
      if (validated.categoryIds.length > 0) {
        await tx.postCategory.createMany({
          data: validated.categoryIds.map((categoryId) => ({
            postId,
            categoryId,
          })),
          skipDuplicates: true,
        })
      }
    }

    // Handle tags update
    if (validated.tagIds !== undefined) {
      // Delete existing tags
      await tx.postTag.deleteMany({
        where: { postId },
      })
      // Create new tags
      if (validated.tagIds.length > 0) {
        await tx.postTag.createMany({
          data: validated.tagIds.map((tagId) => ({
            postId,
            tagId,
          })),
          skipDuplicates: true,
        })
      }
    }

    return updatedPost
  })

  // Đảm bảo post không null sau transaction
  if (!post) {
    throw new NotFoundError("Bài viết không tồn tại")
  }

  const sanitized = sanitizePost(post as PostWithAuthor)

  // Revalidate public cache nếu bài viết đã được publish
  // Next.js 16: Không sử dụng cache update cho admin data
  // Public pages sẽ được revalidate tự động thông qua Next.js automatic revalidation

  // Determine previous status for socket event
  const previousStatus: "active" | "deleted" | null = existing.deletedAt ? "deleted" : "active"

  // Emit socket event for real-time updates
  await emitPostUpsert(sanitized.id, previousStatus)

  // Notify super admins
  await notifySuperAdminsOfPostAction("update", ctx.actorId, {
    id: sanitized.id,
    title: sanitized.title,
    slug: sanitized.slug,
  }, Object.keys(changes).length > 0 ? changes : undefined)

  logActionFlow("posts", "update", "success", { postId: sanitized.id, postTitle: sanitized.title, changes: Object.keys(changes) }, startTime)
  logDetailAction("posts", "update", sanitized.id, { ...sanitized, changes } as unknown as Record<string, unknown>)

  return sanitized
}

export async function deletePost(ctx: AuthContext, postId: string) {
  const startTime = Date.now()
  
  logActionFlow("posts", "delete", "start", { postId, actorId: ctx.actorId })
  ensurePermission(ctx, PERMISSIONS.POSTS_DELETE, PERMISSIONS.POSTS_MANAGE)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    logActionFlow("posts", "delete", "error", { postId, error: "Post not found" })
    throw new NotFoundError("Bài viết không tồn tại")
  }

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  })

  await logTableStatusAfterMutation({
    resource: "posts",
    action: "delete",
    prismaModel: prisma.post,
    affectedIds: postId,
  })

  await emitPostUpsert(postId, "active")


  await notifySuperAdminsOfPostAction("delete", ctx.actorId, {
    id: postId,
    title: existing.title,
    slug: existing.slug,
  })

  logActionFlow("posts", "delete", "success", { postId, postTitle: existing.title }, startTime)

  return { success: true }
}

export async function restorePost(ctx: AuthContext, postId: string) {
  const startTime = Date.now()
  
  logActionFlow("posts", "restore", "start", { postId, actorId: ctx.actorId })
  ensurePermission(ctx, PERMISSIONS.POSTS_UPDATE, PERMISSIONS.POSTS_MANAGE)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    logActionFlow("posts", "restore", "error", { postId, error: "Post not found" })
    throw new NotFoundError("Bài viết không tồn tại")
  }

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: null },
  })

  await logTableStatusAfterMutation({
    resource: "posts",
    action: "restore",
    prismaModel: prisma.post,
    affectedIds: postId,
  })

  await emitPostUpsert(postId, "deleted")


  await notifySuperAdminsOfPostAction("restore", ctx.actorId, {
    id: postId,
    title: existing.title,
    slug: existing.slug,
  })

  logActionFlow("posts", "restore", "success", { postId, postTitle: existing.title }, startTime)

  return { success: true }
}

export async function hardDeletePost(ctx: AuthContext, postId: string) {
  const startTime = Date.now()
  
  logActionFlow("posts", "hard-delete", "start", { postId, actorId: ctx.actorId })
  ensurePermission(ctx, PERMISSIONS.POSTS_MANAGE)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    logActionFlow("posts", "hard-delete", "error", { postId, error: "Post not found" })
    throw new NotFoundError("Bài viết không tồn tại")
  }

  const previousStatus: "active" | "deleted" = existing.deletedAt ? "deleted" : "active"

  await prisma.post.delete({ where: { id: postId } })

  emitPostRemove(postId, previousStatus)


  await notifySuperAdminsOfPostAction("hard-delete", ctx.actorId, {
    id: postId,
    title: existing.title,
    slug: existing.slug,
  })

  logActionFlow("posts", "hard-delete", "success", { postId, postTitle: existing.title }, startTime)

  return { success: true }
}

export async function bulkPostsAction(
  ctx: AuthContext,
  action: "delete" | "restore" | "hard-delete",
  postIds: string[]
): Promise<BulkActionResult> {
  const actionType = action === "delete" ? "bulk-delete" : action === "restore" ? "bulk-restore" : "bulk-hard-delete"
  
  const startTime = Date.now()
  
  logActionFlow("posts", actionType, "start", { requestedCount: postIds.length, requestedIds: postIds, actorId: ctx.actorId })

  if (action === "hard-delete") {
    ensurePermission(ctx, PERMISSIONS.POSTS_MANAGE)
  } else if (action === "delete") {
    ensurePermission(ctx, PERMISSIONS.POSTS_DELETE, PERMISSIONS.POSTS_MANAGE)
  } else {
    ensurePermission(ctx, PERMISSIONS.POSTS_UPDATE, PERMISSIONS.POSTS_MANAGE)
  }

  if (postIds.length === 0) {
    logActionFlow("posts", actionType, "error", { error: "No posts selected" })
    throw new ApplicationError("Không có bài viết nào được chọn", 400)
  }

  let count = 0
  let posts: Array<{ id: string; deletedAt: Date | null; slug: string; published: boolean; publishedAt: Date | null; title?: string }> = []

  if (action === "delete") {
    // Lấy thông tin posts trước khi delete để emit socket events và revalidate cache
    posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        deletedAt: null,
      },
      select: { id: true, deletedAt: true, slug: true, published: true, publishedAt: true, title: true },
    })

    const foundIds = posts.map(p => p.id)
    const notFoundIds = postIds.filter(id => !foundIds.includes(id))

    if (posts.length === 0) {
      let errorMessage = "Không có bài viết nào có thể xóa"
      if (notFoundIds.length > 0) {
        errorMessage += `. ${notFoundIds.length} bài viết đã bị xóa trước đó hoặc không tồn tại`
      }
      
      logActionFlow("posts", "bulk-delete", "error", {
        requestedCount: postIds.length,
        foundCount: posts.length,
        notFoundCount: notFoundIds.length,
        requestedIds: postIds,
        foundIds,
        notFoundIds,
        error: errorMessage,
      })
      
      throw new ApplicationError(errorMessage, 400)
    }

    count = (
      await prisma.post.updateMany({
        where: { id: { in: foundIds }, deletedAt: null },
        data: { deletedAt: new Date() },
      })
    ).count

    if (count > 0) {
      await logTableStatusAfterMutation({
        resource: "posts",
        action: "bulk-delete",
        prismaModel: prisma.post,
        affectedIds: foundIds,
        affectedCount: count,
      })
    }

    if (count > 0 && posts.length > 0) {
      try {
        await emitBatchPostUpsert(posts.map(p => p.id), "active")
      } catch (error) {
        logActionFlow("posts", "bulk-delete", "error", {
          error: error instanceof Error ? error.message : String(error),
          count,
        })
      }
      
      try {
        await notifySuperAdminsOfBulkPostAction("delete", ctx.actorId, count, posts.map(p => ({ title: p.title || "Untitled" })))
      } catch (error) {
        logActionFlow("posts", "bulk-delete", "error", {
          error: error instanceof Error ? error.message : String(error),
          notificationError: true,
        })
      }

      logActionFlow("posts", "bulk-delete", "success", { requestedCount: postIds.length, affectedCount: count }, startTime)
    }
  } else if (action === "restore") {
    // Lấy thông tin posts trước khi restore để tạo notifications
    posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        deletedAt: { not: null },
      },
      select: { id: true, deletedAt: true, slug: true, published: true, publishedAt: true, title: true },
    })

    const foundIds = posts.map(p => p.id)
    const _notFoundIds = postIds.filter(id => !foundIds.includes(id))

    // Kiểm tra nếu không có post nào để restore
    if (posts.length === 0) {
      const allPosts = await prisma.post.findMany({
        where: { id: { in: postIds } },
        select: { id: true, deletedAt: true, title: true },
      })
      const alreadyActiveCount = allPosts.filter(p => p.deletedAt === null).length
      const notFoundCount = postIds.length - allPosts.length
      const notFoundIds = postIds.filter(id => !allPosts.some(p => p.id === id))
      
      let errorMessage = "Không có bài viết nào có thể khôi phục"
      if (alreadyActiveCount > 0) {
        errorMessage += `. ${alreadyActiveCount} bài viết đang ở trạng thái hoạt động`
      }
      if (notFoundCount > 0) {
        errorMessage += `. ${notFoundCount} bài viết không tồn tại`
      }
      
      logActionFlow("posts", "bulk-restore", "error", {
        requestedCount: postIds.length,
        foundCount: posts.length,
        notFoundCount,
        alreadyActiveCount,
        requestedIds: postIds,
        foundIds,
        notFoundIds,
        error: errorMessage,
      })
      
      throw new ApplicationError(errorMessage, 400)
    }

    count = (
      await prisma.post.updateMany({
        where: { 
          id: { in: foundIds },
          deletedAt: { not: null },
        },
        data: { deletedAt: null },
      })
    ).count

    if (count > 0) {
      await logTableStatusAfterMutation({
        resource: "posts",
        action: "bulk-restore",
        prismaModel: prisma.post,
        affectedIds: foundIds,
        affectedCount: count,
      })
    }

    if (count > 0 && posts.length > 0) {
      try {
        await emitBatchPostUpsert(posts.map(p => p.id), "deleted")
      } catch (error) {
        logActionFlow("posts", "bulk-restore", "error", {
          error: error instanceof Error ? error.message : String(error),
          count,
        })
      }
      
      try {
        await notifySuperAdminsOfBulkPostAction("restore", ctx.actorId, count, posts.map(p => ({ title: p.title || "Untitled" })))
      } catch (error) {
        logActionFlow("posts", "bulk-restore", "error", {
          error: error instanceof Error ? error.message : String(error),
          notificationError: true,
        })
      }

      logActionFlow("posts", "bulk-restore", "success", { requestedCount: postIds.length, affectedCount: count }, startTime)
    }
  } else if (action === "hard-delete") {
    // Lấy thông tin posts trước khi delete để emit socket events và revalidate cache
    posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
      },
      select: { id: true, deletedAt: true, slug: true, published: true, publishedAt: true, title: true },
    })

    const foundIds = posts.map(p => p.id)
    const notFoundIds = postIds.filter(id => !foundIds.includes(id))

    if (posts.length === 0) {
      let errorMessage = "Không có bài viết nào có thể xóa vĩnh viễn"
      if (notFoundIds.length > 0) {
        errorMessage += `. ${notFoundIds.length} bài viết không tồn tại`
      }
      
      logActionFlow("posts", "bulk-hard-delete", "error", {
        requestedCount: postIds.length,
        foundCount: posts.length,
        notFoundCount: notFoundIds.length,
        requestedIds: postIds,
        foundIds,
        notFoundIds,
        error: errorMessage,
      })
      
      throw new ApplicationError(errorMessage, 400)
    }

    count = (
      await prisma.post.deleteMany({
        where: { id: { in: foundIds } },
      })
    ).count

    // Emit batch remove events và tạo bulk notification
    if (count > 0) {
      const { getSocketServer } = await import("@/lib/socket/state")
      const io = getSocketServer()
      if (io) {
        const removeEvents = posts.map((post) => ({
          id: post.id,
          previousStatus: (post.deletedAt ? "deleted" : "active") as PostStatus,
        }))
        io.to("role:super_admin").emit("post:batch-remove", { posts: removeEvents })
      }
      
      try {
        await notifySuperAdminsOfBulkPostAction("hard-delete", ctx.actorId, count, posts.map(p => ({ title: p.title || "Untitled" })))
      } catch (error) {
        logActionFlow("posts", "bulk-hard-delete", "error", {
          error: error instanceof Error ? error.message : String(error),
          notificationError: true,
        })
      }

      logActionFlow("posts", "bulk-hard-delete", "success", { requestedCount: postIds.length, affectedCount: count }, startTime)
    }
  }

  // Next.js 16: Không sử dụng cache update cho admin data
  // Public pages sẽ được revalidate tự động thông qua Next.js automatic revalidation

  // Build success message với số lượng thực tế đã xử lý
  let successMessage = ""
  if (action === "restore") {
    successMessage = `Đã khôi phục ${count} bài viết`
  } else if (action === "delete") {
    successMessage = `Đã xóa ${count} bài viết`
  } else if (action === "hard-delete") {
    successMessage = `Đã xóa vĩnh viễn ${count} bài viết`
  }

  if (count > 0) {
    logActionFlow("posts", actionType, "success", { requestedCount: postIds.length, affectedCount: count }, startTime)
  }

  return { success: true, message: successMessage, affected: count }
}


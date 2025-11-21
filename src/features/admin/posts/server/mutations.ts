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
  type AuthContext,
} from "@/features/admin/resources/server"
import { emitPostUpsert, emitPostRemove } from "./events"
import { createPostSchema, updatePostSchema, type CreatePostSchema, type UpdatePostSchema } from "./validation"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

export interface BulkActionResult {
  count: number
}

function sanitizePost(post: PostWithAuthor) {
  return mapPostRecord(post)
}

export async function createPost(ctx: AuthContext, input: CreatePostSchema) {
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

  const post = await prisma.post.create({
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

  const sanitized = sanitizePost(post as PostWithAuthor)

  // Emit socket event for real-time updates
  await emitPostUpsert(sanitized.id, null)

  return sanitized
}

export async function updatePost(
  ctx: AuthContext,
  postId: string,
  input: UpdatePostSchema
) {
  ensurePermission(ctx, PERMISSIONS.POSTS_UPDATE, PERMISSIONS.POSTS_MANAGE)

  const validated = updatePostSchema.parse(input)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    throw new NotFoundError("Bài viết không tồn tại")
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
  if (validated.published !== undefined) updateData.published = validated.published
  if (publishedAt !== undefined) updateData.publishedAt = publishedAt
  if (validated.authorId !== undefined && isSuperAdminUser) {
    // Update author relation using connect
    updateData.author = {
      connect: { id: validated.authorId },
    }
  }

  const post = await prisma.post.update({
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

  const sanitized = sanitizePost(post as PostWithAuthor)

  // Determine previous status for socket event
  const previousStatus: "active" | "deleted" | null = existing.deletedAt ? "deleted" : "active"

  // Emit socket event for real-time updates
  await emitPostUpsert(sanitized.id, previousStatus)

  return sanitized
}

export async function deletePost(ctx: AuthContext, postId: string) {
  ensurePermission(ctx, PERMISSIONS.POSTS_DELETE, PERMISSIONS.POSTS_MANAGE)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    throw new NotFoundError("Bài viết không tồn tại")
  }

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  })

  // Emit socket event for real-time updates
  await emitPostUpsert(postId, "active")

  return { success: true }
}

export async function restorePost(ctx: AuthContext, postId: string) {
  ensurePermission(ctx, PERMISSIONS.POSTS_UPDATE, PERMISSIONS.POSTS_MANAGE)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    throw new NotFoundError("Bài viết không tồn tại")
  }

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: null },
  })

  // Emit socket event for real-time updates
  await emitPostUpsert(postId, "deleted")

  return { success: true }
}

export async function hardDeletePost(ctx: AuthContext, postId: string) {
  ensurePermission(ctx, PERMISSIONS.POSTS_MANAGE)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    throw new NotFoundError("Bài viết không tồn tại")
  }

  // Determine previous status before deletion
  const previousStatus: "active" | "deleted" = existing.deletedAt ? "deleted" : "active"

  await prisma.post.delete({ where: { id: postId } })

  // Emit socket event for real-time updates
  emitPostRemove(postId, previousStatus)

  return { success: true }
}

export async function bulkPostsAction(
  ctx: AuthContext,
  action: "delete" | "restore" | "hard-delete",
  postIds: string[]
): Promise<BulkActionResult> {
  if (action === "hard-delete") {
    ensurePermission(ctx, PERMISSIONS.POSTS_MANAGE)
  } else if (action === "delete") {
    ensurePermission(ctx, PERMISSIONS.POSTS_DELETE, PERMISSIONS.POSTS_MANAGE)
  } else {
    ensurePermission(ctx, PERMISSIONS.POSTS_UPDATE, PERMISSIONS.POSTS_MANAGE)
  }

  if (postIds.length === 0) {
    throw new ApplicationError("Không có bài viết nào được chọn", 400)
  }

  let count = 0
  let posts: Array<{ id: string; deletedAt: Date | null }> = []

  if (action === "delete") {
    // Lấy thông tin posts trước khi delete để emit socket events
    posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        deletedAt: null,
      },
      select: { id: true, deletedAt: true },
    })

    count = (
      await prisma.post.updateMany({
        where: { id: { in: postIds }, deletedAt: null },
        data: { deletedAt: new Date() },
      })
    ).count

    // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
    // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
    if (count > 0) {
      // Emit events song song và await tất cả để đảm bảo hoàn thành
      const emitPromises = posts.map((post) => 
        emitPostUpsert(post.id, "active").catch((error) => {
          console.error(`Failed to emit post:upsert for ${post.id}:`, error)
          return null // Return null để Promise.allSettled không throw
        })
      )
      // Await tất cả events nhưng không fail nếu một số lỗi
      await Promise.allSettled(emitPromises)
    }
  } else if (action === "restore") {
    // Lấy thông tin posts trước khi restore để emit socket events
    posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        deletedAt: { not: null },
      },
      select: { id: true, deletedAt: true },
    })

    count = (
      await prisma.post.updateMany({
        where: { id: { in: postIds }, deletedAt: { not: null } },
        data: { deletedAt: null },
      })
    ).count

    // Emit socket events để update UI - await song song để đảm bảo tất cả events được emit
    // Sử dụng Promise.allSettled để không bị fail nếu một event lỗi
    if (count > 0) {
      // Emit events song song và await tất cả để đảm bảo hoàn thành
      const emitPromises = posts.map((post) => 
        emitPostUpsert(post.id, "deleted").catch((error) => {
          console.error(`Failed to emit post:upsert for ${post.id}:`, error)
          return null // Return null để Promise.allSettled không throw
        })
      )
      // Await tất cả events nhưng không fail nếu một số lỗi
      await Promise.allSettled(emitPromises)
    }
  } else if (action === "hard-delete") {
    // Lấy thông tin posts trước khi delete để emit socket events
    posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
      },
      select: { id: true, deletedAt: true },
    })

    count = (
      await prisma.post.deleteMany({
        where: { id: { in: postIds } },
      })
    ).count

    // Emit socket events để update UI - fire and forget để tránh timeout
    // Emit song song cho tất cả posts đã bị hard delete
    if (count > 0) {
      posts.forEach((post) => {
        const previousStatus: "active" | "deleted" = post.deletedAt ? "deleted" : "active"
        try {
          emitPostRemove(post.id, previousStatus)
        } catch (error) {
          console.error(`Failed to emit post:remove for ${post.id}:`, error)
        }
      })
    }
  }

  return { count }
}


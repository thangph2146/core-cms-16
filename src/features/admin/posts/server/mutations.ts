import type { Prisma } from "@prisma/client"
import { PERMISSIONS } from "@/lib/permissions"
import { prisma } from "@/lib/database"
import { mapPostRecord, type PostWithAuthor } from "./helpers"
import {
  ApplicationError,
  ForbiddenError,
  NotFoundError,
  ensurePermission,
  type AuthContext,
} from "@/features/admin/resources/server"

// Re-export for backward compatibility with API routes
export { ApplicationError, ForbiddenError, NotFoundError, type AuthContext }

export interface CreatePostInput {
  title: string
  content: Prisma.InputJsonValue
  excerpt?: string | null
  slug: string
  image?: string | null
  published?: boolean
  publishedAt?: Date | null
  authorId: string
}

export interface UpdatePostInput {
  title?: string
  content?: Prisma.InputJsonValue
  excerpt?: string | null
  slug?: string
  image?: string | null
  published?: boolean
  publishedAt?: Date | null
}

export interface BulkActionResult {
  count: number
}

function sanitizePost(post: PostWithAuthor) {
  return mapPostRecord(post)
}

export async function createPost(ctx: AuthContext, input: CreatePostInput) {
  ensurePermission(ctx, PERMISSIONS.POSTS_CREATE, PERMISSIONS.POSTS_MANAGE)

  if (!input.title || !input.slug || !input.authorId) {
    throw new ApplicationError("Tiêu đề, slug và tác giả là bắt buộc", 400)
  }

  // Check if slug already exists
  const existing = await prisma.post.findUnique({ where: { slug: input.slug } })
  if (existing) {
    throw new ApplicationError("Slug đã tồn tại", 400)
  }

  // If published, set publishedAt to now if not provided
  const publishedAt = input.published && !input.publishedAt ? new Date() : input.publishedAt

  const post = await prisma.post.create({
    data: {
      title: input.title,
      content: input.content as Prisma.InputJsonValue,
      excerpt: input.excerpt,
      slug: input.slug,
      image: input.image,
      published: input.published ?? false,
      publishedAt: publishedAt,
      authorId: input.authorId,
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

  return sanitizePost(post as PostWithAuthor)
}

export async function updatePost(
  ctx: AuthContext,
  postId: string,
  input: UpdatePostInput
) {
  ensurePermission(ctx, PERMISSIONS.POSTS_UPDATE, PERMISSIONS.POSTS_MANAGE)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    throw new NotFoundError("Bài viết không tồn tại")
  }

  // Check if slug is being changed and if new slug already exists
  if (input.slug && input.slug !== existing.slug) {
    const slugExists = await prisma.post.findUnique({ where: { slug: input.slug } })
    if (slugExists) {
      throw new ApplicationError("Slug đã tồn tại", 400)
    }
  }

  // If published is being set to true and publishedAt is not set, set it to now
  let publishedAt = input.publishedAt
  if (input.published === true && !existing.publishedAt && !publishedAt) {
    publishedAt = new Date()
  } else if (input.published === false) {
    publishedAt = null
  } else if (input.published === true && existing.publishedAt && !publishedAt) {
    publishedAt = existing.publishedAt
  }

  const updateData: Prisma.PostUpdateInput = {}
  
  if (input.title !== undefined) updateData.title = input.title
  if (input.content !== undefined) updateData.content = input.content as Prisma.InputJsonValue
  if (input.excerpt !== undefined) updateData.excerpt = input.excerpt
  if (input.slug !== undefined) updateData.slug = input.slug
  if (input.image !== undefined) updateData.image = input.image
  if (input.published !== undefined) updateData.published = input.published
  if (publishedAt !== undefined) updateData.publishedAt = publishedAt

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

  return sanitizePost(post as PostWithAuthor)
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

  return { success: true }
}

export async function hardDeletePost(ctx: AuthContext, postId: string) {
  ensurePermission(ctx, PERMISSIONS.POSTS_MANAGE)

  const existing = await prisma.post.findUnique({ where: { id: postId } })
  if (!existing) {
    throw new NotFoundError("Bài viết không tồn tại")
  }

  await prisma.post.delete({ where: { id: postId } })

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

  if (action === "delete") {
    count = (
      await prisma.post.updateMany({
        where: { id: { in: postIds }, deletedAt: null },
        data: { deletedAt: new Date() },
      })
    ).count
  } else if (action === "restore") {
    count = (
      await prisma.post.updateMany({
        where: { id: { in: postIds }, deletedAt: { not: null } },
        data: { deletedAt: null },
      })
    ).count
  } else if (action === "hard-delete") {
    count = (
      await prisma.post.deleteMany({
        where: { id: { in: postIds } },
      })
    ).count
  }

  return { count }
}


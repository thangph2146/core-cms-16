import { z } from "zod"

export const createPostSchema = z.object({
  title: z.string().min(1, "Tiêu đề là bắt buộc"),
  content: z.any(), // Prisma.InputJsonValue is hard to validate strictly with Zod, keeping as any or custom refinement if needed
  excerpt: z.string().optional().nullable(),
  slug: z.string().min(1, "Slug là bắt buộc"),
  image: z.string().optional().nullable(),
  published: z.boolean().optional(),
  publishedAt: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") return null
      if (typeof val === "string") return new Date(val)
      return val
    },
    z.date().nullable()
  ).optional(),
  authorId: z.string().min(1, "Tác giả là bắt buộc"),
  categoryIds: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
    if (!val) return []
    if (typeof val === "string") return [val]
    return val
  }),
  tagIds: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
    if (!val) return []
    if (typeof val === "string") return [val]
    return val
  }),
})

export const updatePostSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  excerpt: z.string().optional().nullable(),
  slug: z.string().optional(),
  image: z.string().optional().nullable(),
  published: z.boolean().optional(),
  publishedAt: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") return null
      if (typeof val === "string") return new Date(val)
      return val
    },
    z.date().nullable()
  ).optional(),
  authorId: z.string().optional(),
  categoryIds: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
    if (!val) return []
    if (typeof val === "string") return [val]
    return val
  }),
  tagIds: z.union([z.array(z.string()), z.string()]).optional().transform((val) => {
    if (!val) return []
    if (typeof val === "string") return [val]
    return val
  }),
})

export type CreatePostSchema = z.infer<typeof createPostSchema>
export type UpdatePostSchema = z.infer<typeof updatePostSchema>


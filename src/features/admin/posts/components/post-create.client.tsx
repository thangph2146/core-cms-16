"use client"

import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm, type ResourceFormField, type ResourceFormSection } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
import { isSuperAdmin } from "@/lib/permissions"
import { queryKeys } from "@/lib/query-keys"
import type { Prisma } from "@prisma/client"

export interface PostCreateData {
  title: string
  slug: string
  content: Prisma.JsonValue
  excerpt?: string | null
  image?: string | null
  published?: boolean
  publishedAt?: string | null
  authorId?: string
  categoryIds?: string[] | string
  tagIds?: string[] | string
  [key: string]: unknown
}

export interface PostCreateClientProps {
  backUrl?: string
  users?: Array<{ label: string; value: string }>
  categories?: Array<{ label: string; value: string }>
  tags?: Array<{ label: string; value: string }>
  isSuperAdmin?: boolean
}

export function PostCreateClient({
  backUrl = "/admin/posts",
  users = [],
  categories = [],
  tags = [],
  isSuperAdmin: isSuperAdminProp = false,
}: PostCreateClientProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRoles = session?.roles || []
  const isSuperAdminUser = isSuperAdminProp || isSuperAdmin(userRoles)
  const currentUserId = session?.user?.id

  const handleBack = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts.all(), refetchType: "all" })
    await queryClient.refetchQueries({ queryKey: queryKeys.adminPosts.all(), type: "all" })
  }

  const { handleSubmit } = useResourceFormSubmit({
    apiRoute: apiRoutes.posts.create,
    method: "POST",
    messages: {
      successTitle: "Tạo bài viết thành công",
      successDescription: "Bài viết mới đã được tạo thành công.",
      errorTitle: "Lỗi tạo bài viết",
    },
    navigation: {
      toDetail: (response) =>
        response.data?.data?.id ? `/admin/posts/${response.data.data.id}` : backUrl,
      fallback: backUrl,
    },
    transformData: (data) => {
      const submitData: Record<string, unknown> = {
        ...data,
      }
      // Handle publishedAt
      if (data.published === true && !data.publishedAt) {
        submitData.publishedAt = new Date().toISOString()
      } else if (data.published === false) {
        submitData.publishedAt = null
      }
      if (!isSuperAdminUser && currentUserId) {
        submitData.authorId = currentUserId
      }
      return submitData
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts.all() })
    },
  })

  const createFields: ResourceFormField<PostCreateData>[] = [
    {
      name: "title",
      label: "Tiêu đề",
      type: "text",
      required: true,
      placeholder: "Nhập tiêu đề bài viết",
      description: "Tiêu đề của bài viết",
      section: "basic",
    },
    {
      name: "slug",
      label: "Slug",
      type: "slug",
      sourceField: "title",
      required: true,
      placeholder: "bai-viet-slug",
      description: "URL-friendly version của tiêu đề (tự động tạo từ tiêu đề)",
      section: "basic",
    },
    {
      name: "excerpt",
      label: "Tóm tắt",
      type: "textarea",
      placeholder: "Nhập tóm tắt bài viết",
      description: "Mô tả ngắn gọn về nội dung bài viết",
      section: "basic",
    },
    // Chỉ super admin mới thấy field author
    ...(isSuperAdminUser && users.length > 0
      ? [
          {
            name: "authorId",
            label: "Tác giả",
            type: "select",
            options: users,
            required: true,
            description: "Chọn tác giả của bài viết",
            section: "basic",
          } as ResourceFormField<PostCreateData>,
        ]
      : []),
    {
      name: "published",
      label: "Trạng thái xuất bản",
      type: "switch",
      description: "Trạng thái xuất bản của bài viết",
      section: "basic",
    },
   
    ...(categories.length > 0
      ? [
          {
            name: "categoryIds",
            label: "Danh mục",
            type: "multiple-select",
            options: categories,
            description: "Chọn danh mục cho bài viết (có thể chọn nhiều)",
            section: "basic",
          } as ResourceFormField<PostCreateData>,
        ]
      : []),
    ...(tags.length > 0
      ? [
          {
            name: "tagIds",
            label: "Thẻ tag",
            type: "multiple-select",
            options: tags,
            description: "Chọn thẻ tag cho bài viết (có thể chọn nhiều)",
            section: "basic",
          } as ResourceFormField<PostCreateData>,
        ]
      : []),
    {
      name: "content",
      label: "",
      type: "editor",
      section: "content",
    },
    {
      name: "image",
      label: "Hình ảnh",
      type: "image",
      placeholder: "https://example.com/image.jpg",
      description: "URL hình ảnh đại diện cho bài viết",
      section: "basic",
    },
  ]

  const createSections: ResourceFormSection[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Tiêu đề, slug, tóm tắt và hình ảnh",
    },
    {
      id: "content",
      title: "Nội dung",
      description: "Nội dung chính của bài viết",
    },
    {
      id: "metadata",
      title: "Thông tin bổ sung",
      description: "Trạng thái xuất bản",
    },
  ]

  return (
    <ResourceForm<PostCreateData>
      data={null}
      fields={createFields}
      sections={createSections}
      onSubmit={handleSubmit}
      title="Tạo bài viết mới"
      description="Nhập thông tin để tạo bài viết mới"
      submitLabel="Tạo bài viết"
      cancelLabel="Hủy"
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      onBack={handleBack}
      variant="page"
      showCard={false}
      className="max-w-[100%]"
      resourceName="posts"
      action="create"
    />
  )
}


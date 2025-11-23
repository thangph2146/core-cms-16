"use client"

import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { ResourceForm, type ResourceFormField, type ResourceFormSection } from "@/features/admin/resources/components"
import { useResourceFormSubmit, useResourceDetailData } from "@/features/admin/resources/hooks"
import { createResourceEditOnSuccess } from "@/features/admin/resources/utils"
import { apiRoutes } from "@/lib/api/routes"
import { queryKeys } from "@/lib/query-keys"
import type { Prisma } from "@prisma/client"
import { isSuperAdmin } from "@/lib/permissions"

export interface PostEditData {
    id: string
    title: string
    slug: string
    content: Prisma.JsonValue
    excerpt: string | null
    image: string | null
    published: boolean
    publishedAt: string | null
    authorId: string
    categoryIds?: string[] | string
    tagIds?: string[] | string
    [key: string]: unknown
}

export interface PostEditClientProps {
    post: PostEditData | null
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
    variant?: "dialog" | "sheet" | "page"
    backUrl?: string
    backLabel?: string
    postId?: string
    users?: Array<{ label: string; value: string }>
    categories?: Array<{ label: string; value: string }>
    tags?: Array<{ label: string; value: string }>
    isSuperAdmin?: boolean
}

export function PostEditClient({
    post: initialPost,
    open = true,
    onOpenChange,
    onSuccess,
    variant = "dialog",
    backUrl,
    backLabel = "Quay lại",
    postId,
    users = [],
    categories = [],
    tags = [],
    isSuperAdmin: isSuperAdminProp = false,
}: PostEditClientProps) {
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const userRoles = session?.roles || []
    const isSuperAdminUser = isSuperAdminProp || isSuperAdmin(userRoles)

    // Fetch fresh data từ API để đảm bảo data chính xác (theo chuẩn Next.js 16)
    // Luôn fetch khi có resourceId để đảm bảo data mới nhất, không phụ thuộc vào variant
    const resourceId = postId || initialPost?.id
    const { data: postData } = useResourceDetailData({
      initialData: initialPost || ({} as PostEditData),
      resourceId: resourceId || "",
      detailQueryKey: queryKeys.adminPosts.detail,
      resourceName: "posts",
      fetchOnMount: !!resourceId, // Luôn fetch khi có resourceId để đảm bảo data fresh
    })

    // Sử dụng fresh data từ API nếu có, fallback về initial data
    const post = (postData as PostEditData | null) || initialPost

    const handleBack = async () => {
        // Invalidate React Query cache để đảm bảo list page có data mới nhất
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts.all(), refetchType: "all" })
        // Refetch ngay lập tức để đảm bảo data được cập nhật
        await queryClient.refetchQueries({ queryKey: queryKeys.adminPosts.all(), type: "all" })
    }

    const { handleSubmit } = useResourceFormSubmit({
        apiRoute: (id) => apiRoutes.posts.update(id),
        method: "PUT",
        resourceId: post?.id,
        messages: {
            successTitle: "Cập nhật thành công",
            successDescription: "Bài viết đã được cập nhật.",
            errorTitle: "Lỗi cập nhật",
        },
        navigation: {
            // Luôn navigate về detail page khi variant === "page"
            toDetail: variant === "page" ? (postId || post?.id ? `/admin/posts/${postId || post?.id}` : undefined) : undefined,
            fallback: backUrl,
        },
        transformData: (data) => {
            const submitData: Record<string, unknown> = {
                ...data,
            }
            // Handle publishedAt
            if (data.published === true && !data.publishedAt && !post?.publishedAt) {
                submitData.publishedAt = new Date().toISOString()
            } else if (data.published === false) {
                submitData.publishedAt = null
            }
            // Nếu không phải super admin, không gửi authorId (server sẽ giữ nguyên authorId hiện tại)
            if (!isSuperAdminUser && "authorId" in submitData) {
                delete submitData.authorId
            }
            return submitData
        },
        onSuccess: createResourceEditOnSuccess({
            queryClient,
            resourceId: postId || post?.id,
            allQueryKey: queryKeys.adminPosts.all(),
            detailQueryKey: queryKeys.adminPosts.detail,
            resourceName: "posts",
            getRecordName: (data) => data.title as string | undefined,
            onSuccess,
        }),
    })

    if (!post?.id) {
        return null
    }

    const editFields: ResourceFormField<PostEditData>[] = [
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
                  } as ResourceFormField<PostEditData>,
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
                      type: "select",
                      options: categories,
                      description: "Chọn danh mục cho bài viết (có thể chọn nhiều)",
                      section: "basic",
                  } as ResourceFormField<PostEditData>,
              ]
            : []),
        ...(tags.length > 0
            ? [
                  {
                      name: "tagIds",
                      label: "Thẻ tag",
                      type: "select",
                      options: tags,
                      description: "Chọn thẻ tag cho bài viết (có thể chọn nhiều)",
                      section: "basic",
                  } as ResourceFormField<PostEditData>,
              ]
            : []),
        {
            name: "image",
            label: "Hình ảnh",
            type: "image",
            placeholder: "https://example.com/image.jpg",
            description: "URL hình ảnh đại diện cho bài viết",
            section: "basic",
        },
        {
            name: "content",
            label: "",
            type: "editor",
            section: "content",
        }
    ]

    const editSections: ResourceFormSection[] = [
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
        <ResourceForm<PostEditData>
            data={post}
            fields={editFields}
            sections={editSections}
            onSubmit={handleSubmit}
            open={open}
            onOpenChange={onOpenChange}
            variant={variant}
            title="Chỉnh sửa bài viết"
            description="Cập nhật thông tin bài viết"
            submitLabel="Lưu thay đổi"
            cancelLabel="Hủy"
            backUrl={backUrl}
            backLabel={backLabel}
            onBack={handleBack}
            onSuccess={onSuccess}
            showCard={false}
            className="max-w-[100%]"
        />
    )
}


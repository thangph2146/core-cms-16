"use client"

import { useResourceRouter } from "@/hooks/use-resource-segment"
import { useSession } from "next-auth/react"
import { ResourceForm, type ResourceFormField, type ResourceFormSection } from "@/features/admin/resources/components"
import { useResourceFormSubmit } from "@/features/admin/resources/hooks"
import { apiRoutes } from "@/lib/api/routes"
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
    isSuperAdmin?: boolean
}

export function PostEditClient({
    post,
    open = true,
    onOpenChange,
    onSuccess,
    variant = "dialog",
    backUrl,
    backLabel = "Quay lại",
    postId,
    users = [],
    isSuperAdmin: isSuperAdminProp = false,
}: PostEditClientProps) {
    const router = useResourceRouter()
    const { data: session } = useSession()
    const userRoles = session?.roles || []
    const isSuperAdminUser = isSuperAdminProp || isSuperAdmin(userRoles)

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
            toDetail: variant === "page" && postId ? `/admin/posts/${postId}` : undefined,
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
        onSuccess: async () => {
            onSuccess?.()
            if (variant === "page" && postId) {
                router.refresh()
            }
        },
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
        },

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
            onSuccess={onSuccess}
            showCard={false}
            className="max-w-[100%]"
        />
    )
}


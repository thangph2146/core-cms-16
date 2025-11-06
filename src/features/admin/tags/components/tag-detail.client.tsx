"use client"

import { Tag, Hash, Calendar, Clock, Edit } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField } from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDateVi } from "../utils"

export interface TagDetailData {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  [key: string]: unknown
}

export interface TagDetailClientProps {
  tagId: string
  tag: TagDetailData
  backUrl?: string
}

export function TagDetailClient({ tagId, tag, backUrl = "/admin/tags" }: TagDetailClientProps) {
  const router = useRouter()

  const detailFields: ResourceDetailField<TagDetailData>[] = [
    {
      name: "name",
      label: "Tên thẻ tag",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "slug",
      label: "Slug",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
            <Hash className="h-5 w-5 text-chart-1" />
          </div>
          <div className="font-medium">{String(value || "—")}</div>
        </div>
      ),
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
            <Calendar className="h-5 w-5 text-chart-4" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
    {
      name: "updatedAt",
      label: "Cập nhật lần cuối",
      type: "custom",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
            <Clock className="h-5 w-5 text-chart-5" />
          </div>
          <div>
            <div className="font-medium">{value ? formatDateVi(String(value)) : "—"}</div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <ResourceDetailPage<TagDetailData>
      data={tag}
      fields={detailFields}
      title={tag.name}
      description={`Chi tiết thẻ tag ${tag.slug}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/tags/${tagId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}


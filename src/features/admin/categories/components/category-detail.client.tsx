"use client"

import { Tag, Hash, AlignLeft, Calendar, Clock, Edit } from "lucide-react"
import { ResourceDetailPage, type ResourceDetailField } from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDateVi } from "../utils"

export interface CategoryDetailData {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  [key: string]: unknown
}

export interface CategoryDetailClientProps {
  categoryId: string
  category: CategoryDetailData
  backUrl?: string
}

export function CategoryDetailClient({ categoryId, category, backUrl = "/admin/categories" }: CategoryDetailClientProps) {
  const router = useRouter()

  const detailFields: ResourceDetailField<CategoryDetailData>[] = [
    {
      name: "name",
      label: "Tên danh mục",
      type: "custom",
      section: "basic",
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
      section: "basic",
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
      name: "description",
      label: "Mô tả",
      type: "custom",
      section: "basic",
      render: (value) => (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
            <AlignLeft className="h-5 w-5 text-chart-2" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">{String(value || "—")}</div>
          </div>
        </div>
      ),
    },
    {
      name: "createdAt",
      label: "Ngày tạo",
      type: "custom",
      section: "basic",
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
      section: "basic",
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

  // Sections cho detail view - tất cả fields trong 1 section (5 fields >= 4)
  const detailSections = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về danh mục và thời gian",
    },
  ]

  return (
    <ResourceDetailPage<CategoryDetailData>
      data={category}
      fields={detailFields}
      detailSections={detailSections}
      title={category.name}
      description={`Chi tiết danh mục ${category.slug}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/categories/${categoryId}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      }
    />
  )
}


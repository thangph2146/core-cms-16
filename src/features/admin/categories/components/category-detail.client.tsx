"use client"

import { Tag, Hash, AlignLeft, Calendar, Clock, Edit } from "lucide-react"
import { 
  ResourceDetailClient, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useResourceNavigation, useResourceDetailData, useResourceDetailLogger } from "@/features/admin/resources/hooks"
import { formatDateVi } from "../utils"
import { queryKeys } from "@/lib/query-keys"
import { usePermissions } from "@/hooks/use-permissions"
import { PERMISSIONS } from "@/lib/permissions"

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
  const { navigateBack, router } = useResourceNavigation({
    invalidateQueryKey: queryKeys.adminCategories.all(),
  })
  const { hasAnyPermission } = usePermissions()
  
  // Check permission for edit
  const canUpdate = hasAnyPermission([PERMISSIONS.CATEGORIES_UPDATE, PERMISSIONS.CATEGORIES_MANAGE])

  const { data: detailData, isFetched, isFromApi, fetchedData } = useResourceDetailData({
    initialData: category,
    resourceId: categoryId,
    detailQueryKey: queryKeys.adminCategories.detail,
    resourceName: "categories",
    fetchOnMount: true,
  })

  useResourceDetailLogger({
    resourceName: "categories",
    resourceId: categoryId,
    data: detailData,
    isFetched,
    isFromApi,
    fetchedData,
  })

  const detailFields: ResourceDetailField<CategoryDetailData>[] = []

  const detailSections: ResourceDetailSection<CategoryDetailData>[] = [
    {
      id: "basic",
      title: "Thông tin cơ bản",
      description: "Thông tin chính về danh mục và thời gian",
      fieldsContent: (_fields, data) => {
        const categoryData = data as CategoryDetailData
        
        return (
          <div className="space-y-6">
            {/* Name & Slug */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              <FieldItem icon={Tag} label="Tên danh mục">
                <div className="text-sm font-medium text-foreground">
                  {categoryData.name || "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Hash} label="Slug">
                <div className="text-sm font-medium text-foreground font-mono">
                  {categoryData.slug || "—"}
                </div>
              </FieldItem>
            </div>

            {/* Description */}
            {categoryData.description && (
              <Card className="border border-border/50 bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <AlignLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground mb-2">Mô tả</h3>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground break-words">
                      {categoryData.description || "—"}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Timestamps */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
              <FieldItem icon={Calendar} label="Ngày tạo">
                <div className="text-sm font-medium text-foreground">
                  {categoryData.createdAt ? formatDateVi(categoryData.createdAt) : "—"}
                </div>
              </FieldItem>

              <FieldItem icon={Clock} label="Cập nhật lần cuối">
                <div className="text-sm font-medium text-foreground">
                  {categoryData.updatedAt ? formatDateVi(categoryData.updatedAt) : "—"}
                </div>
              </FieldItem>
            </div>
          </div>
        )
      },
    },
  ]

  const isDeleted = detailData.deletedAt !== null && detailData.deletedAt !== undefined

  return (
    <ResourceDetailClient<CategoryDetailData>
      data={detailData}
      fields={detailFields}
      detailSections={detailSections}
      title={detailData.name}
      description={`Chi tiết danh mục ${detailData.slug}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      onBack={() => navigateBack(backUrl)}
      actions={
        !isDeleted && canUpdate ? (
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/categories/${categoryId}/edit`)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        ) : null
      }
    />
  )
}


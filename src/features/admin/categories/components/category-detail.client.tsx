"use client"

import { useEffect, useRef } from "react"
import { Tag, Hash, AlignLeft, Calendar, Clock, Edit } from "lucide-react"
import { 
  ResourceDetailPage, 
  FieldItem,
  type ResourceDetailField, 
  type ResourceDetailSection 
} from "@/features/admin/resources/components"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useResourceNavigation, useResourceDetailData } from "@/features/admin/resources/hooks"
import { formatDateVi } from "../utils"
import { queryKeys } from "@/lib/query-keys"
import { resourceLogger } from "@/lib/config"

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

  // useRef để track logged state (tránh duplicate logs trong React Strict Mode)
  const loggedDataKeyRef = useRef<string | null>(null)

  // Ưu tiên sử dụng React Query cache nếu có (dữ liệu mới nhất sau khi edit), fallback về props
  // Chỉ log sau khi fetch từ API xong để đảm bảo data mới nhất
  const { data: detailData, isFetched, isFromApi, fetchedData } = useResourceDetailData({
    initialData: category,
    resourceId: categoryId,
    detailQueryKey: queryKeys.adminCategories.detail,
    resourceName: "categories",
    fetchOnMount: true, // Luôn fetch khi mount để đảm bảo data fresh
  })

  // Log detail load một lần cho mỗi unique data state (chỉ log sau khi fetch từ API xong)
  // Sử dụng fetchedData (data từ API) thay vì detailData để đảm bảo log data mới nhất
  useEffect(() => {
    // Chỉ log khi đã fetch xong, data từ API (isFromApi = true), và có fetchedData
    if (!isFetched || !isFromApi || !fetchedData) return
    
    // Tạo unique key từ data để đảm bảo chỉ log khi data thực sự thay đổi
    const dataKey = `${categoryId}-${fetchedData.updatedAt || fetchedData.createdAt || ""}`
    
    // Nếu đã log cho data key này rồi, skip
    if (loggedDataKeyRef.current === dataKey) return
    
    // Mark as logged
    loggedDataKeyRef.current = dataKey
    
    resourceLogger.detailAction({
      resource: "categories",
      action: "load-detail",
      resourceId: categoryId,
      recordData: fetchedData as Record<string, unknown>,
    })

    resourceLogger.dataStructure({
      resource: "categories",
      dataType: "detail",
      structure: {
        fields: fetchedData as Record<string, unknown>,
      },
    })
  }, [categoryId, isFetched, isFromApi, fetchedData?.id, fetchedData?.updatedAt, fetchedData?.createdAt])

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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <>
                <Separator />
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
              </>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="grid gap-4 sm:grid-cols-2">
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

  return (
    <ResourceDetailPage<CategoryDetailData>
      data={detailData}
      fields={detailFields}
      detailSections={detailSections}
      title={detailData.name}
      description={`Chi tiết danh mục ${detailData.slug}`}
      backUrl={backUrl}
      backLabel="Quay lại danh sách"
      onBack={() => navigateBack(backUrl)}
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

